import dotenv from 'dotenv';
dotenv.config({ override: true });

export function getLinkedInApiVersion() {
  if (process.env.LINKEDIN_API_VERSION) {
    return process.env.LINKEDIN_API_VERSION;
  }
  // LinkedIn releases versions monthly (YYYYMM) and each remains active for at least 12 months.
  // Using the previous month ensures an already-released, fully active version is always targeted.
  const now = new Date();
  const target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const year = target.getUTCFullYear();
  const month = String(target.getUTCMonth() + 1).padStart(2, '0');
  return `${year}${month}`;
}

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  appUrl: process.env.APP_URL || 'http://localhost:5000',
  jwtSecret: process.env.JWT_SECRET || 'ekpost_jwt_secret_production_key_2026',
  encryptionSecret: process.env.ENCRYPTION_SECRET_KEY || '9f8e7d6c5b4a3928170e9d8c7b6a5f4e3d2c1b0a9876543210abcdef01234567',
  
  linkedin: {
    clientId: process.env.LINKEDIN_CLIENT_ID || '',
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
    redirectUri: process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:5000/auth/linkedin/callback',
    apiVersion: getLinkedInApiVersion()
  },
  
  meta: {
    appId: process.env.META_APP_ID || '',
    appSecret: process.env.META_APP_SECRET || '',
    redirectUri: process.env.META_REDIRECT_URI || 'http://localhost:5000/auth/meta/callback',
    graphVersion: process.env.META_GRAPH_VERSION || 'v23.0'
  },

  instagram: {
    appId: process.env.INSTAGRAM_APP_ID || '',
    appSecret: process.env.INSTAGRAM_APP_SECRET || '',
    redirectUri: process.env.INSTAGRAM_REDIRECT_URI || 'http://localhost:5000/auth/instagram/callback'
  },

  twitter: {
    clientId: process.env.TWITTER_CLIENT_ID || '',
    clientSecret: process.env.TWITTER_CLIENT_SECRET || '',
    redirectUri: process.env.TWITTER_REDIRECT_URI || 'http://localhost:5000/auth/twitter/callback',
    // OAuth 1.0a credentials (for live token-based publishing)
    consumerKey: process.env.TWITTER_CONSUMER_KEY || '',
    consumerSecret: process.env.TWITTER_CONSUMER_SECRET || '',
    accessToken: process.env.TWITTER_ACCESS_TOKEN || '',
    accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET || ''
  }
};
