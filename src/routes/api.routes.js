import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { AccountStore, db } from '../services/account.store.js';
import { PostService } from '../services/post.service.js';
import { SchedulerService } from '../services/scheduler.service.js';
import { AIService } from '../services/ai.service.js';
import { AnalyticsService } from '../services/analytics.service.js';
import { BillingService } from '../services/billing.service.js';
import { UserService } from '../services/user.service.js';

export const apiRouter = Router();

// User context middleware
function userContext(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      req.user = decoded;
    } catch (e) {
      req.user = { id: 'user_default_admin', name: 'Demo Creator', email: 'admin@ekpost.com' };
    }
  } else {
    req.user = { id: 'user_default_admin', name: 'Demo Creator', email: 'admin@ekpost.com' };
  }
  next();
}

apiRouter.use(userContext);

// 1. Get user connected accounts
apiRouter.get('/accounts', (req, res) => {
  const accounts = AccountStore.getAccountsByUser(req.user.id);
  res.json({ success: true, data: accounts });
});

// 2. Add / Connect Real Live Social Account
apiRouter.post('/accounts', (req, res) => {
  const { platform, name, platformUserId, token, avatar } = req.body;
  if (!platform || !name || !platformUserId || !token) {
    return res.status(400).json({ success: false, error: 'Missing required account fields' });
  }

  const newAcc = AccountStore.addAccount({
    userId: req.user.id,
    platform,
    name,
    platformUserId,
    token,
    avatar
  });

  res.json({ success: true, message: 'Account connected successfully!', data: newAcc });
});

// 3. Disconnect an account
apiRouter.delete('/accounts/:id', (req, res) => {
  const success = AccountStore.removeAccount(req.params.id, req.user.id);
  res.json({ success, message: success ? 'Account disconnected.' : 'Account not found.' });
});

// 4. Instant publish (LinkedIn & X/Twitter)
apiRouter.post('/posts/publish', async (req, res) => {
  const { content, mediaUrl, accountIds } = req.body;

  if (!content?.trim() && !mediaUrl) {
    return res.status(400).json({ success: false, error: 'Post content is required.' });
  }

  let targetIds = accountIds;
  if (!targetIds || !Array.isArray(targetIds) || targetIds.length === 0) {
    const userAccounts = AccountStore.getAccountsByUser(req.user.id);
    if (!userAccounts || userAccounts.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No social accounts are connected. Please connect LinkedIn or X (Twitter) first.'
      });
    }
    targetIds = userAccounts.map(a => a.id);
  }

  try {
    const postResult = await PostService.publishToMultipleAccounts({
      userId: req.user.id,
      content,
      mediaUrl,
      accountIds: targetIds
    });

    if (postResult.status === 'FAILED') {
      const failedResult = postResult.results?.find(r => r.status === 'FAILED');
      return res.status(400).json({
        success: false,
        error: failedResult?.error || 'Failed to publish post.',
        data: postResult
      });
    }

    res.json({
      success: true,
      message: 'Post published successfully!',
      data: postResult
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Schedule a post
apiRouter.post('/posts/schedule', (req, res) => {
  const { content, mediaUrl, accountIds, scheduledAt } = req.body;

  if (!content && !mediaUrl) {
    return res.status(400).json({ success: false, error: 'Content or media is required.' });
  }

  if (!accountIds || !Array.isArray(accountIds) || accountIds.length === 0) {
    return res.status(400).json({ success: false, error: 'Select at least one platform/account.' });
  }

  if (!scheduledAt) {
    return res.status(400).json({ success: false, error: 'Valid schedule date and time is required.' });
  }

  try {
    const job = SchedulerService.schedulePost({
      content,
      mediaUrl,
      accountIds,
      scheduledAt
    });
    res.json({ success: true, message: 'Post scheduled successfully!', data: job });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 6. Retry a failed post
apiRouter.post('/posts/:id/retry', async (req, res) => {
  const post = db.posts.find(p => p.id === req.params.id && (p.userId === req.user.id || req.user.id === 'user_default_admin'));
  if (!post) {
    return res.status(404).json({ success: false, error: 'Post not found' });
  }

  const accounts = AccountStore.getAccountsByUser(req.user.id);
  const accountIds = accounts.map(a => a.id);

  try {
    const retriedPost = await PostService.publishToMultipleAccounts({
      userId: req.user.id,
      content: post.content,
      mediaUrl: post.mediaUrl,
      accountIds: accountIds
    });
    res.json({ success: true, message: 'Post retried successfully!', data: retriedPost });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Get post history & calendar data
apiRouter.get('/posts', (req, res) => {
  const { platform, status } = req.query;
  let posts = PostService.getPostsByUser(req.user.id);

  if (status && status !== 'ALL') {
    posts = posts.filter(p => p.status === status);
  }

  if (platform && platform !== 'ALL') {
    posts = posts.filter(p => p.results?.some(r => r.platform?.includes(platform)));
  }

  res.json({ success: true, data: posts });
});

// 8. AI Caption Generator
apiRouter.post('/ai/generate', async (req, res) => {
  const { prompt, tone } = req.body;
  try {
    const result = await AIService.generateCaptions({ prompt, tone });
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 9. Analytics Overview
apiRouter.get('/analytics', (req, res) => {
  const overview = AnalyticsService.getOverview();
  res.json(overview);
});

// 10. SaaS Plans & Billing
apiRouter.get('/billing/plans', (req, res) => {
  res.json({ success: true, data: BillingService.getPlans() });
});

apiRouter.post('/billing/checkout', async (req, res) => {
  const { planId } = req.body;
  try {
    const session = await BillingService.createCheckoutSession({ 
      planId, 
      customerEmail: req.user.email 
    });
    res.json(session);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 11. Profile Update
apiRouter.put('/profile', (req, res) => {
  const { name, email } = req.body;
  const user = UserService.findUserById(req.user.id);
  if (user) {
    if (name) user.name = name;
    if (email) user.email = email;
    return res.json({ success: true, message: 'Profile updated successfully!', user: { id: user.id, name: user.name, email: user.email } });
  }
  res.status(404).json({ success: false, error: 'User not found' });
});
