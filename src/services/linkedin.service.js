/**
 * linkedin.service.js
 * Isolated LinkedIn API service for EkPost.
 * All LinkedIn API calls are encapsulated here.
 * Never expose credentials or access tokens to frontend.
 */

import axios from 'axios';
import { config } from '../config/env.js';
import { AccountStore } from './account.store.js';

const LINKEDIN_AUTH_BASE = 'https://www.linkedin.com/oauth/v2';
const LINKEDIN_API_BASE  = 'https://api.linkedin.com';
const MEMBER_SCOPES      = ['openid', 'profile', 'email', 'w_member_social'];

export function getCandidateVersions() {
  const versions = [];
  const configured = config.linkedin.apiVersion;
  if (configured) {
    versions.push(String(configured));
  }

  const d = new Date();
  for (let offset = 1; offset <= 6; offset++) {
    const targetDate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - offset, 1));
    const y = targetDate.getUTCFullYear();
    const m = String(targetDate.getUTCMonth() + 1).padStart(2, '0');
    const v = `${y}${m}`;
    if (!versions.includes(v)) {
      versions.push(v);
    }
  }

  const currYear = d.getUTCFullYear();
  const currMonth = String(d.getUTCMonth() + 1).padStart(2, '0');
  const currV = `${currYear}${currMonth}`;
  if (!versions.includes(currV)) {
    versions.push(currV);
  }

  return versions;
}

export function getLinkedInVersionHeader() {
  return { 'LinkedIn-Version': config.linkedin.apiVersion || '202608' };
}

// ─── OAuth Helpers ───────────────────────────────────────────────────────────

export function buildAuthorizationUrl(state) {
  if (!config.linkedin.clientId) {
    throw new LinkedInError('LINKEDIN_CLIENT_ID is not configured in environment variables.', 'CONFIG_ERROR', 500);
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id:     config.linkedin.clientId,
    redirect_uri:  config.linkedin.redirectUri,
    state:         state,
    scope:         MEMBER_SCOPES.join(' ')
  });

  return `${LINKEDIN_AUTH_BASE}/authorization?${params.toString()}`;
}

export async function exchangeCodeForToken(code) {
  if (!code) {
    throw new LinkedInError('Authorization code is required', 'INVALID_CODE', 400);
  }

  const params = new URLSearchParams({
    grant_type:    'authorization_code',
    code:          code,
    redirect_uri:  config.linkedin.redirectUri,
    client_id:     config.linkedin.clientId,
    client_secret: config.linkedin.clientSecret
  });

  try {
    const response = await axios.post(
      `${LINKEDIN_AUTH_BASE}/accessToken`,
      params.toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    return {
      accessToken: response.data.access_token,
      expiresIn:   response.data.expires_in
    };
  } catch (err) {
    const detail = err.response?.data;
    const msg = detail?.error_description || detail?.message || err.message;
    throw new LinkedInError(`Token exchange failed: ${msg}`, 'TOKEN_EXCHANGE_FAILED', err.response?.status);
  }
}

export async function getMemberProfile(accessToken) {
  if (!accessToken) {
    throw new LinkedInError('Access token is required to fetch profile', 'MISSING_TOKEN', 401);
  }

  try {
    const res = await axios.get(`${LINKEDIN_API_BASE}/v2/userinfo`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const sub = res.data.sub;
    const authorUrn = sub?.startsWith('urn:li:person:') ? sub : `urn:li:person:${sub}`;

    return {
      sub:       sub,
      authorUrn: authorUrn,
      name:      res.data.name || 'LinkedIn User',
      email:     res.data.email || '',
      picture:   res.data.picture || ''
    };
  } catch (err) {
    const detail = err.response?.data;
    const msg = detail?.message || err.message;
    throw new LinkedInError(`Failed to fetch LinkedIn profile: ${msg}`, 'PROFILE_FETCH_FAILED', err.response?.status);
  }
}

// ─── Publishing ──────────────────────────────────────────────────────────────

/**
 * Publish a post to LinkedIn.
 * Accepts flexible input: publishToLinkedIn(post)
 * where post can have { content, text, commentary, accessToken, authorUrn, userId, mediaType }
 *
 * Supported types:
 * - TEXT (fully functional)
 * - IMAGE, VIDEO, DOCUMENT (extensible architecture)
 */
export async function publishToLinkedIn(post) {
  if (!post) {
    throw new LinkedInError('Post object is required', 'EMPTY_POST', 400);
  }

  const rawContent = post.content || post.text || post.commentary || '';
  const mediaType  = post.mediaType || 'TEXT';

  if (!rawContent.trim()) {
    throw new LinkedInError('Post text content cannot be empty.', 'EMPTY_CONTENT', 400);
  }

  let accessToken = post.accessToken;
  let authorUrn   = post.authorUrn;

  // If accessToken or authorUrn not passed directly, look up active connection
  if (!accessToken || !authorUrn) {
    const userId = post.userId || 'user_default_admin';
    const account = AccountStore.getLinkedInAccount(userId);
    if (!account) {
      throw new LinkedInError('LinkedIn account is not connected. Please connect LinkedIn first.', 'NOT_CONNECTED', 400);
    }
    accessToken = accessToken || account.token;
    authorUrn   = authorUrn   || account.platformUserId;
  }

  if (!accessToken) {
    throw new LinkedInError('No valid LinkedIn access token found.', 'MISSING_TOKEN', 401);
  }

  // Ensure author is a valid URN
  if (!authorUrn.startsWith('urn:li:')) {
    authorUrn = `urn:li:person:${authorUrn}`;
  }

  const safeContent = sanitizePostContent(rawContent);

  const candidateVersions = getCandidateVersions();
  let lastErr = null;
  let imageUrn = null;

  const isImage = Boolean(
    post.mediaUrl && (
      mediaType === 'IMAGE' ||
      post.mediaUrl.startsWith('data:image') ||
      post.mediaUrl.startsWith('data:') ||
      /\.(jpe?g|png|gif|webp|bmp|svg)(\?.*)?$/i.test(post.mediaUrl)
    )
  );

  for (const ver of candidateVersions) {
    try {
      if (isImage && !imageUrn) {
        imageUrn = await uploadLinkedInImage({
          accessToken,
          authorUrn,
          mediaUrl: post.mediaUrl,
          apiVersion: ver
        });
      }

      const payload = buildPostPayload({
        authorUrn,
        content: safeContent,
        mediaUrl: post.mediaUrl,
        mediaType,
        imageUrn
      });

      const headers = {
        Authorization:               `Bearer ${accessToken}`,
        'Content-Type':              'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
        'LinkedIn-Version':          ver
      };

      const response = await axios.post(`${LINKEDIN_API_BASE}/rest/posts`, payload, { headers });
      const postId = response.headers['x-restli-id'] || response.data?.id || `li_post_${Date.now()}`;
      return {
        success: true,
        platform: 'linkedin',
        postId,
        url: `https://www.linkedin.com/feed/update/${postId}`
      };
    } catch (err) {
      lastErr = err;
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || '';
      // If error is specifically about an inactive or unsupported API version, try next active candidate version
      if (err.response?.status === 426 || msg.includes('not active') || msg.includes('version')) {
        console.warn(`[LinkedIn] Version ${ver} returned inactive/unsupported. Attempting next candidate version...`);
        imageUrn = null; // Re-attempt with the next version if needed
        continue;
      }
      // For any other error (e.g. auth expired, invalid payload, rate limit), break immediately
      break;
    }
  }

  handleLinkedInApiError(lastErr);
}

export async function uploadLinkedInImage({ accessToken, authorUrn, mediaUrl, apiVersion }) {
  if (!mediaUrl) return null;

  let buffer;
  let mimeType = 'image/jpeg';

  try {
    if (mediaUrl.startsWith('data:')) {
      const match = mediaUrl.match(/^data:([^;]+);base64,(.+)$/s);
      if (match) {
        mimeType = match[1];
        buffer = Buffer.from(match[2], 'base64');
      } else {
        const commaIdx = mediaUrl.indexOf(',');
        buffer = Buffer.from(commaIdx > -1 ? mediaUrl.slice(commaIdx + 1) : mediaUrl, 'base64');
      }
    } else if (/^https?:\/\//i.test(mediaUrl)) {
      const imgRes = await axios.get(mediaUrl, {
        responseType: 'arraybuffer',
        timeout: 20000
      });
      buffer = Buffer.from(imgRes.data);
      if (imgRes.headers['content-type']) {
        mimeType = imgRes.headers['content-type'].split(';')[0].trim();
      }
    } else {
      buffer = Buffer.from(mediaUrl, 'base64');
    }
  } catch (downloadErr) {
    throw new LinkedInError(`Failed to process image attachment: ${downloadErr.message}`, 'IMAGE_PROCESS_ERROR', 400);
  }

  mimeType = (mimeType || 'image/jpeg').split(';')[0].trim();
  if (!mimeType.startsWith('image/')) {
    mimeType = 'image/jpeg';
  }

  const version = apiVersion || config.linkedin.apiVersion || '202608';

  // 1. Initialize image upload via LinkedIn Images API
  const initHeaders = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'X-Restli-Protocol-Version': '2.0.0',
    'LinkedIn-Version': version
  };

  const initBody = {
    initializeUploadRequest: {
      owner: authorUrn
    }
  };

  const initRes = await axios.post(
    `${LINKEDIN_API_BASE}/rest/images?action=initializeUpload`,
    initBody,
    { headers: initHeaders }
  );

  const uploadUrl = initRes.data?.value?.uploadUrl;
  const imageUrn  = initRes.data?.value?.image;

  if (!uploadUrl || !imageUrn) {
    throw new LinkedInError('LinkedIn failed to provide an upload URL for the image.', 'IMAGE_INIT_FAILED', 500);
  }

  // 2. Binary upload to uploadUrl
  try {
    await axios.put(uploadUrl, buffer, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': mimeType,
        'LinkedIn-Version': version
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      timeout: 30000
    });
  } catch (putErr) {
    // If uploadUrl rejects Authorization header (some pre-signed blob stores), retry without it
    if (putErr.response?.status === 400 || putErr.response?.status === 401 || putErr.response?.status === 403) {
      await axios.put(uploadUrl, buffer, {
        headers: {
          'Content-Type': mimeType
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 30000
      });
    } else {
      throw putErr;
    }
  }

  return imageUrn;
}

export async function revokeAccessToken(accessToken) {
  if (!accessToken) return;
  try {
    const params = new URLSearchParams({
      token:         accessToken,
      client_id:     config.linkedin.clientId,
      client_secret: config.linkedin.clientSecret
    });
    await axios.post(
      `${LINKEDIN_AUTH_BASE}/revoke`,
      params.toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
  } catch (err) {
    console.warn('[LinkedIn] Token revocation note:', err.response?.data || err.message);
  }
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

function buildPostPayload({ authorUrn, content, mediaUrl, mediaType, imageUrn }) {
  const base = {
    author:       authorUrn,
    commentary:   content,
    visibility:   'PUBLIC',
    distribution: {
      feedDistribution:              'MAIN_FEED',
      targetEntities:                [],
      thirdPartyDistributionChannels: []
    },
    lifecycleState:            'PUBLISHED',
    isReshareDisabledByAuthor: false
  };

  if (imageUrn) {
    base.content = {
      media: {
        id: imageUrn,
        altText: content.slice(0, 100) || 'EkPost Image'
      }
    };
  } else if (mediaUrl && /^https?:\/\//i.test(mediaUrl)) {
    base.content = {
      article: {
        source: mediaUrl,
        title: content.slice(0, 50) || 'EkPost Share',
        description: content.slice(0, 150)
      }
    };
  }

  return base;
}

function sanitizePostContent(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/<[^>]*>/g, '') // Strip HTML tags
    .trim()
    .slice(0, 3000);         // LinkedIn commentary character limit
}

function handleLinkedInApiError(err) {
  const status  = err.response?.status;
  const detail  = err.response?.data;
  const message = detail?.message || detail?.error || err.message;

  if (status === 401) {
    throw new LinkedInError('LinkedIn token has expired or is invalid. Please reconnect your account.', 'TOKEN_EXPIRED', 401);
  }
  if (status === 403) {
    throw new LinkedInError('Permission denied. Ensure "w_member_social" scope is granted.', 'PERMISSION_DENIED', 403);
  }
  if (status === 422) {
    throw new LinkedInError(`LinkedIn rejected post payload: ${message}`, 'INVALID_PAYLOAD', 422);
  }
  if (status === 429) {
    throw new LinkedInError('LinkedIn rate limit reached. Please try again in a few minutes.', 'RATE_LIMITED', 429);
  }

  throw new LinkedInError(`LinkedIn API error: ${message}`, 'API_ERROR', status || 500);
}

export class LinkedInError extends Error {
  constructor(message, code, statusCode) {
    super(message);
    this.name       = 'LinkedInError';
    this.code       = code;
    this.statusCode = statusCode || 500;
  }
}
