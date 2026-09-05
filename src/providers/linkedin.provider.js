import axios from 'axios';
import { config } from '../config/env.js';
import { publishToLinkedIn } from '../services/linkedin.service.js';

export class LinkedInProvider {
  /**
   * Generate LinkedIn OAuth 2.0 Authorization URL
   */
  static getAuthUrl(state = 'ekpost_oauth_state') {
    const scopes = ['openid', 'profile', 'email', 'w_member_social', 'w_organization_social', 'r_organization_social'];
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.linkedin.clientId,
      redirect_uri: config.linkedin.redirectUri,
      scope: scopes.join(' '),
      state: state
    });
    return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  static async getAccessToken(code) {

    const tokenUrl = 'https://www.linkedin.com/oauth/v2/accessToken';
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: config.linkedin.redirectUri,
      client_id: config.linkedin.clientId,
      client_secret: config.linkedin.clientSecret
    });

    const response = await axios.post(tokenUrl, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const accessToken = response.data.access_token;
    
    // Fetch user profile info
    const profileRes = await axios.get('https://api.linkedin.com/v2/userinfo', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    return {
      accessToken: accessToken,
      expiresIn: response.data.expires_in,
      sub: profileRes.data.sub,
      name: profileRes.data.name,
      picture: profileRes.data.picture
    };
  }

  /**
   * Publish post to LinkedIn Profile or Organization Page
   * @param {Object} options
   * @param {string} options.accessToken - Decrypted OAuth access token
   * @param {string} options.authorUrn - "urn:li:person:..." or "urn:li:organization:..."
   * @param {string} options.commentary - Text content of the post
   * @param {string} [options.mediaUrl] - Optional image URL to attach
   */
  static async publishPost({ accessToken, authorUrn, commentary, mediaUrl }) {
    if (accessToken?.startsWith('mock_')) {
      return {
        success: true,
        platform: 'linkedin',
        postId: 'urn:li:share:mock_' + Date.now(),
        url: `https://linkedin.com/feed/update/urn:li:share:mock_${Date.now()}`,
        mode: 'simulated'
      };
    }

    return publishToLinkedIn({
      accessToken,
      authorUrn,
      content: commentary,
      mediaUrl
    });
  }
}
