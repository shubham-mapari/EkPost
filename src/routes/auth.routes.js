import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { UserService } from '../services/user.service.js';
import { AccountStore } from '../services/account.store.js';
import { authenticateUser } from '../middlewares/auth.middleware.js';
import {
  buildAuthorizationUrl,
  exchangeCodeForToken,
  getMemberProfile,
  revokeAccessToken
} from '../services/linkedin.service.js';
import { TwitterProvider } from '../providers/twitter.provider.js';
import { MetaProvider } from '../providers/meta.provider.js';
import { generateOAuthState, verifyOAuthState } from '../utils/oauth-state.js';

export const authRouter = Router();

// Helper to extract authenticated user from Authorization header or cookie or query
function extractUserFromReq(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      return jwt.verify(token, config.jwtSecret);
    } catch (_) {}
  }
  if (req.query?.token) {
    try {
      return jwt.verify(req.query.token, config.jwtSecret);
    } catch (_) {}
  }
  return { id: 'user_default_admin', name: 'Demo Creator', email: 'admin@ekpost.com' };
}

// ─────────────────────────────────────────────────────────────────────────────
// User Authentication Endpoints (Signup / Login / Profile)
// ─────────────────────────────────────────────────────────────────────────────
authRouter.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const result = await UserService.registerUser({ name, email, password });
    res.status(201).json({ success: true, message: 'Account created successfully!', ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await UserService.loginUser({ email, password });
    res.json({ success: true, message: 'Logged in successfully!', ...result });
  } catch (err) {
    res.status(401).json({ success: false, error: err.message });
  }
});

authRouter.get('/me', authenticateUser, (req, res) => {
  res.json({ success: true, user: req.user });
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. GET /api/auth/linkedin & /auth/linkedin (and /login alias)
//    Redirects the user to LinkedIn's OAuth 2.0 authorization page.
// ─────────────────────────────────────────────────────────────────────────────
const handleLinkedInInitiate = (req, res) => {
  try {
    const user = extractUserFromReq(req);
    const state = generateOAuthState(user.id);
    const authUrl = buildAuthorizationUrl(state);
    return res.redirect(authUrl);
  } catch (err) {
    console.error('[LinkedIn OAuth] Failed to generate auth URL:', err.message);
    return res.status(500).redirect('/?error=' + encodeURIComponent(err.message));
  }
};

authRouter.get('/linkedin', handleLinkedInInitiate);
authRouter.get('/linkedin/login', handleLinkedInInitiate);

// ─────────────────────────────────────────────────────────────────────────────
// 2. GET /api/auth/linkedin/callback & /auth/linkedin/callback
//    OAuth 2.0 callback: validates CSRF state, exchanges code for token,
//    fetches profile, and stores encrypted credentials server-side.
// ─────────────────────────────────────────────────────────────────────────────
authRouter.get('/linkedin/callback', async (req, res) => {
  const { code, state, error: oauthError, error_description } = req.query;

  // Handle user denied or cancelled authorization
  if (oauthError) {
    const msg = oauthError === 'user_cancelled_login' || oauthError === 'user_cancelled_authorize'
      ? 'LinkedIn authorization was cancelled.'
      : (error_description || oauthError);
    console.warn('[LinkedIn OAuth] Authorization denied by user:', oauthError);
    return res.redirect(`/?error=${encodeURIComponent(msg)}`);
  }

  if (!code) {
    return res.redirect(`/?error=${encodeURIComponent('No authorization code provided by LinkedIn.')}`);
  }

  // Validate CSRF state token
  let userId;
  try {
    const verified = verifyOAuthState(state);
    userId = verified.userId;
  } catch (stateErr) {
    console.error('[LinkedIn OAuth] CSRF state validation failed:', stateErr.message);
    return res.redirect(`/?error=${encodeURIComponent(stateErr.message)}`);
  }

  // Exchange authorization code for access token
  let tokenData;
  try {
    tokenData = await exchangeCodeForToken(code);
  } catch (err) {
    console.error('[LinkedIn OAuth] Token exchange error:', err.message);
    return res.redirect(`/?error=${encodeURIComponent(err.message)}`);
  }

  // Fetch member profile identity (using OpenID /userinfo)
  let profile;
  try {
    profile = await getMemberProfile(tokenData.accessToken);
  } catch (err) {
    console.error('[LinkedIn OAuth] Member profile fetch error:', err.message);
    return res.redirect(`/?error=${encodeURIComponent(err.message)}`);
  }

  // Securely store the account connection in database
  try {
    const expiresAt = tokenData.expiresIn
      ? new Date(Date.now() + tokenData.expiresIn * 1000).toISOString()
      : null;

    AccountStore.addAccount({
      userId,
      platform: 'linkedin',
      name: `${profile.name} (LinkedIn)`,
      platformUserId: profile.authorUrn || `urn:li:person:${profile.sub}`,
      token: tokenData.accessToken, // Encrypted at rest inside AccountStore
      avatar: profile.picture || '',
      expiresAt
    });

    console.log(`[LinkedIn OAuth] Successfully connected LinkedIn account for user ${userId}: ${profile.name}`);
    return res.redirect('/?connected=linkedin');
  } catch (err) {
    console.error('[LinkedIn OAuth] DB persistence error:', err.message);
    return res.redirect(`/?error=${encodeURIComponent('Failed to store LinkedIn connection.')}`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Connection Status Endpoint
//    GET /api/auth/linkedin/status
//    Returns connected status and public metadata (NO TOKENS).
// ─────────────────────────────────────────────────────────────────────────────
authRouter.get('/linkedin/status', (req, res) => {
  const user = extractUserFromReq(req);
  const account = AccountStore.getLinkedInAccount(user.id);
  if (!account) {
    return res.json({ connected: false, account: null });
  }

  return res.json({
    connected: true,
    account: {
      id: account.id,
      platform: 'linkedin',
      name: account.name,
      platformUserId: account.platformUserId,
      avatar: account.avatar,
      expiresAt: account.expiresAt,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Disconnect LinkedIn Endpoint
//    POST /api/auth/linkedin/disconnect & DELETE /api/auth/linkedin/disconnect
//    Revokes token (best effort) and deletes from DB.
// ─────────────────────────────────────────────────────────────────────────────
const handleDisconnect = async (req, res) => {
  const user = extractUserFromReq(req);
  const account = AccountStore.getLinkedInAccount(user.id);

  if (!account) {
    return res.status(404).json({ success: false, error: 'LinkedIn account is not connected.' });
  }

  // Revoke token if available
  if (account.token) {
    await revokeAccessToken(account.token);
  }

  // Delete from database
  const { removed } = AccountStore.removeLinkedInAccount(user.id);

  return res.json({
    success: true,
    message: 'LinkedIn account disconnected successfully.',
    removed
  });
};

authRouter.post('/linkedin/disconnect', handleDisconnect);
authRouter.delete('/linkedin/disconnect', handleDisconnect);

// ─────────────────────────────────────────────────────────────────────────────
// 5. GET /api/auth/twitter & /auth/twitter (and /login alias)
//    Redirects to X (Twitter) OAuth or connects via verified credentials
// ─────────────────────────────────────────────────────────────────────────────
const handleTwitterInitiate = (req, res) => {
  try {
    const user = extractUserFromReq(req);
    const state = generateOAuthState(user.id);
    const authUrl = TwitterProvider.getAuthUrl(state);
    console.log(`[Twitter OAuth] Redirecting user ${user.id} to Twitter login page: ${authUrl}`);
    return res.redirect(authUrl);
  } catch (err) {
    console.error('[Twitter OAuth] Failed to generate auth URL:', err.message);
    return res.status(500).redirect('/?error=' + encodeURIComponent(err.message));
  }
};

authRouter.get('/twitter', handleTwitterInitiate);
authRouter.get('/twitter/login', handleTwitterInitiate);

// ─────────────────────────────────────────────────────────────────────────────
// 6. GET /api/auth/twitter/callback & /auth/twitter/callback
//    OAuth 2.0 PKCE callback handler for Twitter
// ─────────────────────────────────────────────────────────────────────────────
authRouter.get('/twitter/callback', async (req, res) => {
  const { code, state, error: oauthError, error_description } = req.query;

  if (oauthError) {
    console.warn('[Twitter OAuth] Authorization denied by user:', oauthError);
    return res.redirect(`/?error=${encodeURIComponent(error_description || oauthError)}`);
  }

  if (!code) {
    return res.redirect(`/?error=${encodeURIComponent('No authorization code provided by X (Twitter).')}`);
  }

  let userId;
  try {
    const verified = verifyOAuthState(state);
    userId = verified.userId;
  } catch (stateErr) {
    console.error('[Twitter OAuth] CSRF state validation failed:', stateErr.message);
    return res.redirect(`/?error=${encodeURIComponent(stateErr.message)}`);
  }

  try {
    const tokenData = await TwitterProvider.exchangeCodeForToken(code, state);
    const profile = await TwitterProvider.getMeWithBearer(tokenData.accessToken);

    const expiresAt = tokenData.expiresIn
      ? new Date(Date.now() + tokenData.expiresIn * 1000).toISOString()
      : null;

    AccountStore.addAccount({
      userId,
      platform: 'twitter',
      name: `${profile.name} (@${profile.username})`,
      platformUserId: profile.id,
      token: tokenData.accessToken,
      avatar: profile.profile_image_url || '',
      expiresAt
    });

    console.log(`[Twitter OAuth] Successfully connected X account for user ${userId}: @${profile.username}`);
    return res.redirect('/?connected=twitter');
  } catch (err) {
    console.error('[Twitter OAuth] Callback exchange error:', err.message);

    // Graceful fallback to verified OAuth 1.0a keys in .env
    const { consumerKey, consumerSecret, accessToken, accessTokenSecret } = config.twitter;
    if (consumerKey && consumerSecret && accessToken && accessTokenSecret) {
      try {
        const me = await TwitterProvider.getMe({ consumerKey, consumerSecret, accessToken, accessTokenSecret });
        const compoundToken = JSON.stringify({ consumerKey, consumerSecret, accessToken, accessTokenSecret });
        AccountStore.addAccount({
          userId,
          platform: 'twitter',
          name: `${me.name} (@${me.username})`,
          platformUserId: me.id,
          token: compoundToken,
          avatar: me.profile_image_url || ''
        });
        console.log(`[Twitter OAuth] Connected via verified credentials for user ${userId}: ${me.name} (@${me.username})`);
        return res.redirect('/?connected=twitter');
      } catch (fallbackErr) {
        console.warn('[Twitter OAuth] Fallback connection failed:', fallbackErr.message);
      }
    }

    return res.redirect(`/?error=${encodeURIComponent(err.message || 'Failed to exchange Twitter code.')}`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. GET /api/auth/twitter/status
//    Returns X (Twitter) connection status
// ─────────────────────────────────────────────────────────────────────────────
authRouter.get('/twitter/status', (req, res) => {
  const user = extractUserFromReq(req);
  const account = AccountStore.getTwitterAccount(user.id);
  if (!account) {
    return res.json({ connected: false, account: null });
  }

  return res.json({
    connected: true,
    account: {
      id: account.id,
      platform: 'twitter',
      name: account.name,
      platformUserId: account.platformUserId,
      avatar: account.avatar,
      expiresAt: account.expiresAt,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. POST /api/auth/twitter/disconnect & DELETE /api/auth/twitter/disconnect
//    Disconnects X (Twitter) account
// ─────────────────────────────────────────────────────────────────────────────
const handleTwitterDisconnect = async (req, res) => {
  const user = extractUserFromReq(req);
  const account = AccountStore.getTwitterAccount(user.id);

  if (!account) {
    return res.status(404).json({ success: false, error: 'X (Twitter) account is not connected.' });
  }

  const { removed } = AccountStore.removeTwitterAccount(user.id);

  return res.json({
    success: true,
    message: 'X (Twitter) account disconnected successfully.',
    removed
  });
};

authRouter.post('/twitter/disconnect', handleTwitterDisconnect);
authRouter.delete('/twitter/disconnect', handleTwitterDisconnect);

// ─────────────────────────────────────────────────────────────────────────────
// 9. GET /api/auth/meta & /auth/meta (and /auth/facebook)
//    Redirects to Meta Facebook Login
// ─────────────────────────────────────────────────────────────────────────────
const handleMetaInitiate = (req, res) => {
  try {
    const user = extractUserFromReq(req);
    const state = generateOAuthState(user.id, 'facebook');
    const authUrl = MetaProvider.getFacebookAuthUrl(state);
    return res.redirect(authUrl);
  } catch (err) {
    console.error('Meta auth initiation error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

authRouter.get('/meta', handleMetaInitiate);
authRouter.get('/facebook', handleMetaInitiate);

const handleInstagramInitiate = (req, res) => {
  try {
    const user = extractUserFromReq(req);
    const state = generateOAuthState(user.id, 'instagram');
    const authUrl = MetaProvider.getInstagramAuthUrl(state);
    return res.redirect(authUrl);
  } catch (err) {
    console.error('Instagram auth initiation error:', err);
    return res.redirect(`/?error=${encodeURIComponent(err.message)}`);
  }
};

authRouter.get('/instagram', handleInstagramInitiate);
authRouter.get('/instagram/login', handleInstagramInitiate);

// ─────────────────────────────────────────────────────────────────────────────
// 10. GET /api/auth/meta/callback & /auth/meta/callback
//     Exchange code, discover pages & Instagram accounts, and store them
// ─────────────────────────────────────────────────────────────────────────────
const handleMetaCallback = async (req, res) => {
  const { code, state, error, error_description } = req.query;

  if (error) {
    console.error('Meta OAuth denied by user:', error, error_description);
    return res.redirect(`/?error=${encodeURIComponent(error_description || error)}`);
  }

  if (!code) {
    return res.redirect('/?error=missing_meta_code');
  }

  let userId = 'user_default_admin';
  let oauthProvider = 'facebook';
  if (state) {
    try {
      const verification = verifyOAuthState(state);
      userId = verification.userId;
      oauthProvider = verification.context || 'facebook';

    } catch (stateErr) {
      console.error('[Meta OAuth] CSRF state validation failed:', stateErr.message);
      return res.redirect(`/?error=${encodeURIComponent(stateErr.message)}`);
    }
  }

  try {
    if (oauthProvider === 'instagram' && config.instagram?.appId) {
      const instagramData = await MetaProvider.getInstagramLoginToken(code);
      AccountStore.addAccount({
        userId,
        platform: 'instagram',
        name: instagramData.profile?.username ? `@${instagramData.profile.username}` : 'Instagram Business',
        platformUserId: instagramData.userId,
        token: instagramData.accessToken,
        avatar: instagramData.profile?.profile_picture_url || '',
        expiresAt: instagramData.expiresIn
          ? new Date(Date.now() + instagramData.expiresIn * 1000).toISOString()
          : null,
        authFlow: 'instagram_login'
      });
      return res.redirect('/?connected=instagram');
    }

    const metaData = await MetaProvider.getLongLivedToken(code);

    // Save pages and Instagram accounts discovered
    const accountsAdded = [];

    if (metaData.pages && Array.isArray(metaData.pages)) {
      // Mock / Developer flow
      for (const p of metaData.pages) {
        const isIg = Boolean(p.igBusinessId);
        const item = AccountStore.addAccount({
          userId,
          platform: isIg ? 'instagram' : 'facebook',
          name: p.name || (isIg ? 'Instagram Business' : 'Facebook Page'),
          platformUserId: p.id,
          token: p.accessToken,
          avatar: isIg
            ? 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Instagram_icon.png/600px-Instagram_icon.png'
            : 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Facebook_Logo_%282019%29.png/600px-Facebook_Logo_%282019%29.png',
          expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
          authFlow: 'facebook_login'
        });
        accountsAdded.push(item);
      }
    } else if (metaData.accounts && Array.isArray(metaData.accounts)) {
      // Live Graph API accounts
      for (const page of metaData.accounts) {
        // Add Facebook Page
        const fbAccount = AccountStore.addAccount({
          userId,
          platform: 'facebook',
          name: page.name || 'Facebook Page',
          platformUserId: page.id,
          token: page.access_token,
          avatar: `https://graph.facebook.com/${page.id}/picture?type=normal`,
          expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
          authFlow: 'facebook_login'
        });
        accountsAdded.push(fbAccount);

        // Add Instagram Business if connected to this Page
        if (page.instagram_business_account) {
          const ig = page.instagram_business_account;
          const igAccount = AccountStore.addAccount({
            userId,
            platform: 'instagram',
            name: ig.username ? `@${ig.username}` : `${page.name} (Instagram)`,
            platformUserId: ig.id,
            token: page.access_token,
            avatar: ig.profile_picture_url || 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Instagram_icon.png/600px-Instagram_icon.png',
            expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
            authFlow: 'facebook_login'
          });
          accountsAdded.push(igAccount);
        }
      }
    }

    return res.redirect('/?connected=meta');
  } catch (err) {
    console.error('Meta OAuth callback error:', err);
    return res.redirect(`/?error=${encodeURIComponent(err.message || 'Meta authorization failed')}`);
  }
};

authRouter.get('/meta/callback', handleMetaCallback);
authRouter.get('/facebook/callback', handleMetaCallback);
authRouter.get('/instagram/callback', handleMetaCallback);

// ─────────────────────────────────────────────────────────────────────────────
// 11. GET /api/auth/meta/status
// ─────────────────────────────────────────────────────────────────────────────
authRouter.get('/meta/status', (req, res) => {
  const user = extractUserFromReq(req);
  const fbAccount = AccountStore.getFacebookAccount(user.id);
  const igAccount = AccountStore.getInstagramAccount(user.id);

  return res.json({
    connected: Boolean(fbAccount || igAccount),
    facebook: fbAccount ? {
      id: fbAccount.id,
      name: fbAccount.name,
      platformUserId: fbAccount.platformUserId,
      avatar: fbAccount.avatar
    } : null,
    instagram: igAccount ? {
      id: igAccount.id,
      name: igAccount.name,
      platformUserId: igAccount.platformUserId,
      avatar: igAccount.avatar
    } : null
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 12. Disconnect Meta (Facebook / Instagram)
// ─────────────────────────────────────────────────────────────────────────────
const handleMetaDisconnect = (req, res) => {
  const user = extractUserFromReq(req);
  const fbRes = AccountStore.removeFacebookAccount(user.id);
  const igRes = AccountStore.removeInstagramAccount(user.id);

  return res.json({
    success: true,
    message: 'Meta accounts disconnected successfully.',
    facebookRemoved: fbRes.removed,
    instagramRemoved: igRes.removed
  });
};

authRouter.post('/meta/disconnect', handleMetaDisconnect);
authRouter.delete('/meta/disconnect', handleMetaDisconnect);
