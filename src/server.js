import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config/env.js';
import { apiRouter } from './routes/api.routes.js';
import { authRouter } from './routes/auth.routes.js';
import { TwitterProvider } from './providers/twitter.provider.js';
import { AccountStore } from './services/account.store.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Trust reverse proxies (Nginx / Cloudflare / AWS ALB for accurate client IPs and SSL)
app.set('trust proxy', 1);

// Security & Scalability Middlewares
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static Assets Caching & Serving
app.use(express.static(path.join(__dirname, '../public'), {
  maxAge: config.nodeEnv === 'production' ? '1d' : 0,
  etag: true
}));

// API & Auth Routes
app.use('/api', apiRouter);
app.use('/auth', authRouter);
app.use('/api/auth', authRouter);

// Health Check Endpoint (Used by Load Balancers & Kubernetes Liveness Probes)
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    platform: 'EkPost SaaS Engine',
    uptime: `${Math.floor(process.uptime())}s`,
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv
  });
});

// SPA Fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ─────────────────────────────────────────────────────────────────────────────
// Auto-seed Twitter/X account if OAuth 1.0a credentials are present in .env
// ─────────────────────────────────────────────────────────────────────────────
async function seedTwitterAccount() {
  const { consumerKey, consumerSecret, accessToken, accessTokenSecret } = config.twitter;
  if (!consumerKey || !consumerSecret || !accessToken || !accessTokenSecret) {
    return; // No credentials configured – skip silently
  }

  try {
    const me = await TwitterProvider.getMe({ consumerKey, consumerSecret, accessToken, accessTokenSecret });

    // Store compound token as JSON so post.service.js can unpack all 4 keys
    const compoundToken = JSON.stringify({ consumerKey, consumerSecret, accessToken, accessTokenSecret });

    AccountStore.addAccount({
      userId:         'user_default_admin',
      platform:       'twitter',
      name:           `${me.name} (@${me.username})`,
      platformUserId: me.id,
      token:          compoundToken,
      avatar:         me.profile_image_url || ''
    });

    console.log(`✅ [Twitter] Auto-connected: ${me.name} (@${me.username})`);
  } catch (err) {
    console.warn(`⚠️  [Twitter] Auto-connect failed: ${err.message}`);
  }
}

// Start Server
app.listen(config.port, async () => {
  console.log(`\n==============================================`);
  console.log(`🚀 EkPost High-Performance Server running at: http://localhost:${config.port}`);
  console.log(`📱 Mobile-Ready Web App: http://localhost:${config.port}`);
  console.log(`==============================================\n`);

  await seedTwitterAccount();
});
