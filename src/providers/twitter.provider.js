import crypto from 'crypto';
import axios from 'axios';
import { config } from '../config/env.js';

// ─────────────────────────────────────────────────────────────────────────────
// Twitter / X Provider – OAuth 1.0a HMAC-SHA1 signing
// Supports: X API v2 – Tweet creation (/2/tweets)
// ─────────────────────────────────────────────────────────────────────────────

function percentEncode(str) {
  return encodeURIComponent(String(str))
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A');
}

/**
 * Build an OAuth 1.0a Authorization header with HMAC-SHA1 signature
 * @param {string} method - HTTP method (GET, POST)
 * @param {string} url - Full request URL (no query string)
 * @param {Object} queryParams - URL query params included in signature base string
 * @param {Object} opts - Override consumer/token keys (optional)
 */
function buildOAuth1Header(method, url, queryParams = {}, opts = {}) {
  const consumerKey    = opts.consumerKey    || config.twitter.consumerKey;
  const consumerSecret = opts.consumerSecret || config.twitter.consumerSecret;
  const token          = opts.accessToken    || config.twitter.accessToken;
  const tokenSecret    = opts.accessTokenSecret || config.twitter.accessTokenSecret;

  const oauthParams = {
    oauth_consumer_key:     consumerKey,
    oauth_nonce:            crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp:        Math.floor(Date.now() / 1000).toString(),
    oauth_token:            token,
    oauth_version:          '1.0'
  };

  // Merge query params + oauth params for signature base string
  const allParams = { ...queryParams, ...oauthParams };
  const sortedKeys = Object.keys(allParams).sort();
  const paramString = sortedKeys
    .map(k => `${percentEncode(k)}=${percentEncode(allParams[k])}`)
    .join('&');

  const baseString = [method.toUpperCase(), percentEncode(url), percentEncode(paramString)].join('&');
  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;

  const signature = crypto.createHmac('sha1', signingKey).update(baseString).digest('base64');
  oauthParams.oauth_signature = signature;

  const headerValue = Object.keys(oauthParams)
    .sort()
    .map(k => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`)
    .join(', ');

  return `OAuth ${headerValue}`;
}

export class TwitterProvider {
  // In-memory store for active PKCE state -> codeVerifier (TTL: 10 minutes)
  static pkceStore = new Map();

  /**
   * Generate RFC 7636 compliant S256 PKCE challenge & verifier
   */
  static generatePKCE() {
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');
    return { codeVerifier, codeChallenge };
  }

  /**
   * Generate X (Twitter) OAuth 2.0 PKCE Authorization URL with S256
   */
  static getAuthUrl(state = 'ekpost_twitter_state') {
    const scopes = ['tweet.read', 'tweet.write', 'users.read', 'offline.access'];
    const clientId = config.twitter.clientId || config.twitter.consumerKey || 'T5TOfFsxgjFkIuyzZjKfTXnOW';

    // Generate compliant S256 PKCE pair
    const { codeVerifier, codeChallenge } = this.generatePKCE();

    // Store verifier for token exchange on callback
    this.pkceStore.set(state, {
      codeVerifier,
      expiresAt: Date.now() + 10 * 60 * 1000
    });

    const params = new URLSearchParams({
      response_type:         'code',
      client_id:             clientId,
      redirect_uri:          config.twitter.redirectUri,
      scope:                 scopes.join(' '),
      state:                 state,
      code_challenge:        codeChallenge,
      code_challenge_method: 'S256',
      prompt:                'login',
      force_login:           'true'
    });
    return `https://twitter.com/i/oauth2/authorize?${params.toString()}`;
  }

  /**
   * Exchange X (Twitter) OAuth 2.0 PKCE authorization code for access token
   */
  static async exchangeCodeForToken(code, stateOrVerifier) {
    const tokenUrl = 'https://api.twitter.com/2/oauth2/token';
    const clientId = config.twitter.clientId || config.twitter.consumerKey || 'T5TOfFsxgjFkIuyzZjKfTXnOW';
    const clientSecret = config.twitter.clientSecret || config.twitter.consumerSecret;

    // Resolve verifier from state store or direct argument
    let codeVerifier = stateOrVerifier;
    if (this.pkceStore.has(stateOrVerifier)) {
      const stored = this.pkceStore.get(stateOrVerifier);
      codeVerifier = stored.codeVerifier;
      this.pkceStore.delete(stateOrVerifier);
    }

    if (!codeVerifier) {
      codeVerifier = 'ekpost_challenge';
    }

    const params = new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      client_id: clientId,
      redirect_uri: config.twitter.redirectUri,
      code_verifier: codeVerifier
    });

    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded'
    };

    if (clientSecret && !clientSecret.startsWith('mock_')) {
      const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      headers['Authorization'] = `Basic ${basicAuth}`;
    }

    const res = await axios.post(tokenUrl, params.toString(), { headers });
    return {
      accessToken: res.data.access_token,
      refreshToken: res.data.refresh_token,
      expiresIn: res.data.expires_in,
      scope: res.data.scope
    };
  }

  /**
   * Fetch authenticated user profile using OAuth 2.0 Bearer token
   */
  static async getMeWithBearer(accessToken) {
    const url = 'https://api.twitter.com/2/users/me?user.fields=profile_image_url,name,username';
    const res = await axios.get(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return res.data.data;
  }

  /**
   * Fetch the authenticated user's profile using OAuth 1.0a
   * Used to auto-seed the Twitter account on server startup.
   */
  static async getMe(opts = {}) {
    const url = 'https://api.twitter.com/2/users/me';
    const queryParams = { 'user.fields': 'profile_image_url,name,username' };
    const authHeader = buildOAuth1Header('GET', url, queryParams, opts);

    const res = await axios.get(`${url}?user.fields=profile_image_url,name,username`, {
      headers: { Authorization: authHeader }
    });
    return res.data.data; // { id, name, username, profile_image_url }
  }

  /**
   * Publish a Tweet via X API v2 using OAuth 1.0a or OAuth 2.0 Bearer token
   * @param {Object} options
   * @param {string} options.text             - Tweet text (max 280 chars)
   * @param {string} [options.accessToken]    - User access token (override)
   * @param {string} [options.accessTokenSecret] - User access token secret (override)
   * @param {string} [options.consumerKey]    - Consumer key override
   * @param {string} [options.consumerSecret] - Consumer secret override
   * @param {boolean} [options.isOAuth2]     - Explicitly force OAuth 2.0 Bearer authorization
   */
  static async publishTweet({ text, accessToken, accessTokenSecret, consumerKey, consumerSecret, isOAuth2 }) {
    const opts = { accessToken, accessTokenSecret, consumerKey, consumerSecret };

    // If the stored token looks like a mock, simulate the tweet
    const resolvedToken = accessToken || config.twitter.accessToken || '';
    if (resolvedToken.startsWith('mock_') || !resolvedToken) {
      return {
        success:  true,
        platform: 'twitter',
        postId:   'tweet_mock_' + Date.now(),
        url:      `https://x.com/user/status/mock_${Date.now()}`,
        mode:     'simulated'
      };
    }

    const tweetUrl = 'https://api.twitter.com/2/tweets';
    const body     = { text: String(text).slice(0, 280) };

    try {
      let authHeader;
      // If OAuth 2.0 token or missing OAuth 1.0a secret keys, use Bearer auth
      if (isOAuth2 || (!accessTokenSecret && !config.twitter.accessTokenSecret)) {
        authHeader = `Bearer ${resolvedToken}`;
      } else {
        // OAuth 1.0a signs the POST endpoint URL (not body for JSON)
        authHeader = buildOAuth1Header('POST', tweetUrl, {}, opts);
      }

      const res = await axios.post(tweetUrl, body, {
        headers: {
          Authorization:  authHeader,
          'Content-Type': 'application/json'
        }
      });

      const tweetId = res.data?.data?.id;

      return {
        success:  true,
        platform: 'twitter',
        postId:   tweetId,
        url:      `https://x.com/i/web/status/${tweetId}`
      };
    } catch (error) {
      const err = error.response?.data || error.message;
      console.error('[Twitter] Publish Error:', JSON.stringify(err));
      throw new Error(err?.detail || err?.title || err?.errors?.[0]?.message || 'Twitter tweet publish failed');
    }
  }
}
