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

function cleanStr(val, fallback = '') {
  if (val === undefined || val === null) return fallback;
  return String(val).trim().replace(/^["']|["']$/g, '').trim();
}

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: cleanStr(process.env.NODE_ENV, 'development'),
  appUrl: cleanStr(process.env.APP_URL, 'http://localhost:5000'),
  jwtSecret: cleanStr(process.env.JWT_SECRET, 'ekpost_jwt_secret_production_key_2026'),
  encryptionSecret: cleanStr(process.env.ENCRYPTION_SECRET_KEY, '9f8e7d6c5b4a3928170e9d8c7b6a5f4e3d2c1b0a9876543210abcdef01234567'),
  
  linkedin: {
    clientId: cleanStr(process.env.LINKEDIN_CLIENT_ID),
    clientSecret: cleanStr(process.env.LINKEDIN_CLIENT_SECRET),
    redirectUri: cleanStr(process.env.LINKEDIN_REDIRECT_URI, 'http://localhost:5000/auth/linkedin/callback'),
    apiVersion: getLinkedInApiVersion()
  },
  
  meta: {
    appId: cleanStr(process.env.META_APP_ID),
    appSecret: cleanStr(process.env.META_APP_SECRET),
    redirectUri: cleanStr(process.env.META_REDIRECT_URI, 'http://localhost:5000/auth/meta/callback'),
    graphVersion: cleanStr(process.env.META_GRAPH_VERSION, 'v23.0')
  },

  instagram: {
    appId: cleanStr(process.env.INSTAGRAM_APP_ID),
    appSecret: cleanStr(process.env.INSTAGRAM_APP_SECRET),
    redirectUri: cleanStr(process.env.INSTAGRAM_REDIRECT_URI, 'http://localhost:5000/auth/instagram/callback')
  },

  twitter: {
    clientId: cleanStr(process.env.TWITTER_CLIENT_ID),
    clientSecret: cleanStr(process.env.TWITTER_CLIENT_SECRET),
    redirectUri: cleanStr(process.env.TWITTER_REDIRECT_URI, 'http://localhost:5000/auth/twitter/callback'),
    // OAuth 1.0a credentials (for live token-based publishing)
    consumerKey: cleanStr(process.env.TWITTER_CONSUMER_KEY),
    consumerSecret: cleanStr(process.env.TWITTER_CONSUMER_SECRET),
    accessToken: cleanStr(process.env.TWITTER_ACCESS_TOKEN),
    accessTokenSecret: cleanStr(process.env.TWITTER_ACCESS_TOKEN_SECRET)
  },

  cloudinary: {
    cloudName: cleanStr(process.env.CLOUDINARY_CLOUD_NAME),
    apiKey: cleanStr(process.env.CLOUDINARY_API_KEY),
    apiSecret: cleanStr(process.env.CLOUDINARY_API_SECRET)
  },

  email: {
    smtpHost: cleanStr(process.env.SMTP_HOST, 'smtp.gmail.com'),
    smtpPort: parseInt(process.env.SMTP_PORT || '465', 10),
    smtpSecure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : true,
    smtpUser: cleanStr(process.env.SMTP_USER),
    smtpPass: cleanStr(process.env.SMTP_PASS),
    fromEmail: cleanStr(process.env.EMAIL_FROM, 'EkPost <noreply@ekpost.com>')
  }
};
