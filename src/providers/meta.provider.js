import axios from 'axios';
import { config } from '../config/env.js';

export class MetaProvider {
  static assertConfigured() {
    if (!config.meta.appId) {
      throw new Error('META_APP_ID is not configured. Add your Meta App credentials to .env.');
    }
  }

  /** Generate a Facebook Login URL for discovering and connecting Pages. */
  static getFacebookAuthUrl(state = 'ekpost_facebook_state') {
    this.assertConfigured();
    const scopes = [
      'pages_show_list',
      'pages_read_engagement'
    ];
    const params = new URLSearchParams({
      client_id: config.meta.appId,
      redirect_uri: config.meta.redirectUri,
      scope: scopes.join(','),
      response_type: 'code',
      state: state
    });
    return `https://www.facebook.com/${config.meta.graphVersion}/dialog/oauth?${params.toString()}`;
  }

  /** Generate an Instagram OAuth URL.
   * If a dedicated Instagram app is not configured, fall back to the Meta/Facebook
   * login flow used for Instagram Business accounts and connected Pages.
   */
  static getInstagramAuthUrl(state = 'ekpost_instagram_state') {
    if (!config.instagram?.appId) {
      return this.getFacebookAuthUrl(state);
    }

    const scopes = ['instagram_business_basic', 'instagram_business_content_publish'];
    const params = new URLSearchParams({
      client_id: config.instagram.appId,
      redirect_uri: config.instagram.redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      state: state
    });

    return `https://www.instagram.com/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchange code for Short-Lived and then Long-Lived User Token (60 days)
   */
  static async getLongLivedToken(code) {
    if (config.meta.appId === 'mock_meta_app_id') {
      return {
        accessToken: 'mock_meta_token_' + Date.now(),
        pages: [
          { id: 'mock_fb_page_101', name: 'Demo Facebook Page', accessToken: 'mock_fb_page_token' },
          { id: 'mock_ig_account_202', name: 'Demo Instagram Business', accessToken: 'mock_ig_page_token', igBusinessId: 'mock_ig_account_202' }
        ]
      };
    }

    if (!config.meta.appSecret) {
      throw new Error('META_APP_SECRET is not configured.');
    }
    if (!code) {
      throw new Error('Meta authorization code is required.');
    }

    // 1. Get Short Lived Token
    const tokenRes = await axios.get(`https://graph.facebook.com/${config.meta.graphVersion}/oauth/access_token`, {
      params: {
        client_id: config.meta.appId,
        client_secret: config.meta.appSecret,
        redirect_uri: config.meta.redirectUri,
        code: code
      }
    });
    const shortLivedToken = tokenRes.data.access_token;

    // 2. Exchange for Long Lived Token (60 days)
    const longLivedRes = await axios.get(`https://graph.facebook.com/${config.meta.graphVersion}/oauth/access_token`, {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: config.meta.appId,
        client_secret: config.meta.appSecret,
        fb_exchange_token: shortLivedToken
      }
    });
    const longLivedToken = longLivedRes.data.access_token;

    // 3. Fetch User's Facebook Pages & Instagram Accounts
    let accounts = [];
    try {
      const accountsRes = await axios.get(`https://graph.facebook.com/${config.meta.graphVersion}/me/accounts`, {
        params: {
          fields: 'id,name,access_token,instagram_business_account{id,username,profile_picture_url}',
          access_token: longLivedToken
        }
      });
      accounts = accountsRes.data.data || [];
    } catch (accErr) {
      console.warn('[Meta] Could not fetch /me/accounts:', accErr.message);
    }

    // 4. Fetch User's Personal Facebook Profile (Fallback & Name)
    let userProfile = null;
    try {
      const userRes = await axios.get(`https://graph.facebook.com/${config.meta.graphVersion}/me`, {
        params: {
          fields: 'id,name,picture',
          access_token: longLivedToken
        }
      });
      userProfile = userRes.data || null;
    } catch (uErr) {
      console.warn('[Meta] Could not fetch /me user profile:', uErr.message);
    }

    return {
      accessToken: longLivedToken,
      accounts: accounts,
      user: userProfile
    };
  }

  /** Exchange an Instagram Login code and return a long-lived Instagram token. */
  static async getInstagramLoginToken(code) {
    if (!config.instagram.appId || !config.instagram.appSecret) {
      throw new Error('Instagram App credentials are not configured. Add INSTAGRAM_APP_ID and INSTAGRAM_APP_SECRET to .env.');
    }
    if (!code) {
      throw new Error('Instagram authorization code is required.');
    }

    const tokenRes = await axios.post('https://api.instagram.com/oauth/access_token', new URLSearchParams({
      client_id: config.instagram.appId,
      client_secret: config.instagram.appSecret,
      grant_type: 'authorization_code',
      redirect_uri: config.instagram.redirectUri,
      code
    }).toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const shortLivedToken = tokenRes.data.access_token;
    const userId = tokenRes.data.user_id;
    const longLivedRes = await axios.get('https://graph.instagram.com/access_token', {
      params: {
        grant_type: 'ig_exchange_token',
        client_secret: config.instagram.appSecret,
        access_token: shortLivedToken
      }
    });

    const profileRes = await axios.get('https://graph.instagram.com/me', {
      params: {
        fields: 'id,user_id,username,name,profile_picture_url',
        access_token: longLivedRes.data.access_token
      }
    });

    return {
      accessToken: longLivedRes.data.access_token,
      userId: profileRes.data.user_id || profileRes.data.id || userId,
      profile: profileRes.data,
      expiresIn: longLivedRes.data.expires_in
    };
  }

  /**
   * Publish Text or Image Post to a Facebook Page
   * @param {Object} options
   * @param {string} options.pageId - Facebook Page ID
   * @param {string} options.pageToken - Page Access Token
   * @param {string} options.message - Post caption/text
   * @param {string} [options.imageUrl] - Optional image URL
   */
  static async publishToFacebookPage({ pageId, pageToken, message, imageUrl }) {
    if (pageToken?.startsWith('mock_')) {
      return {
        success: true,
        platform: 'facebook',
        postId: `${pageId}_mock_${Date.now()}`,
        url: `https://facebook.com/${pageId}`,
        mode: 'simulated'
      };
    }

    try {
      if (imageUrl) {
        // Photo Post
        const res = await axios.post(`https://graph.facebook.com/${config.meta.graphVersion}/${pageId}/photos`, {
          url: imageUrl,
          caption: message,
          access_token: pageToken
        });
        return {
          success: true,
          platform: 'facebook',
          postId: res.data.id || res.data.post_id,
          url: `https://facebook.com/${res.data.id || res.data.post_id}`
        };
      } else {
        // Standard Feed Post
        const res = await axios.post(`https://graph.facebook.com/${config.meta.graphVersion}/${pageId}/feed`, {
          message: message,
          access_token: pageToken
        });
        return {
          success: true,
          platform: 'facebook',
          postId: res.data.id,
          url: `https://facebook.com/${res.data.id}`
        };
      }
    } catch (error) {
      const err = error.response?.data || error.message;
      console.error('Facebook Publish Error:', err);
      throw new Error(err?.error?.message || 'Facebook publish failed');
    }
  }

  /**
   * Publish Single Image Post to Instagram Business Account (2-Step Container Flow)
   * @param {Object} options
   * @param {string} options.igUserId - Instagram Business User ID
   * @param {string} options.pageToken - Facebook Page Access Token linked to IG
   * @param {string} options.caption - Post Caption
   * @param {string} options.imageUrl - Publicly accessible HTTPS Image URL (Required for IG)
   */
  static async publishToInstagram({ igUserId, pageToken, caption, imageUrl, authFlow = 'facebook_login' }) {
    if (!imageUrl) {
      throw new Error('Instagram requires an image or video URL (Text-only posts are not supported).');
    }

    if (!/^https:\/\//i.test(imageUrl)) {
      throw new Error('Instagram requires a publicly accessible HTTPS media URL. Local uploads are not supported yet.');
    }

    if (pageToken?.startsWith('mock_')) {
      return {
        success: true,
        platform: 'instagram',
        postId: `ig_mock_${Date.now()}`,
        url: `https://instagram.com`,
        mode: 'simulated'
      };
    }

    try {
      const baseUrl = authFlow === 'instagram_login'
        ? 'https://graph.instagram.com'
        : `https://graph.facebook.com/${config.meta.graphVersion}`;

      // Step 1: Create Media Container
      const containerRes = await axios.post(`${baseUrl}/${igUserId}/media`, {
        image_url: imageUrl,
        caption: caption,
        access_token: pageToken
      });

      const containerId = containerRes.data?.id;
      if (!containerId) {
        throw new Error('Failed to create Instagram media container.');
      }

      // Step 2: Wait 2-3 seconds for Meta media pipeline processing
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Step 3: Publish Container
      const publishRes = await axios.post(`${baseUrl}/${igUserId}/media_publish`, {
        creation_id: containerId,
        access_token: pageToken
      });

      return {
        success: true,
        platform: 'instagram',
        postId: publishRes.data.id,
        url: `https://instagram.com/p/${publishRes.data.id}`
      };
    } catch (error) {
      const err = error.response?.data || error.message;
      console.error('Instagram Publish Error:', err);
      throw new Error(err?.error?.message || 'Instagram publish failed');
    }
  }
}
