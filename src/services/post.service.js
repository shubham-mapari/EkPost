import { publishToLinkedIn } from './linkedin.service.js';
import { TwitterProvider } from '../providers/twitter.provider.js';
import { MetaProvider } from '../providers/meta.provider.js';
import { AccountStore, db, saveStoreToDisk } from './account.store.js';

export class PostService {
  /**
   * Publish post to selected accounts (supports LinkedIn & X/Twitter)
   */
  static async publishToMultipleAccounts({ userId, content, mediaUrl, accountIds }) {
    const postId = `post_${Date.now()}`;
    const newPost = {
      id: postId,
      userId: userId || 'user_default_admin',
      content,
      mediaUrl,
      status: 'PUBLISHING',
      createdAt: new Date().toISOString(),
      results: []
    };

    const targetAccountIds = Array.isArray(accountIds) ? accountIds : [accountIds];

    const publishPromises = targetAccountIds.map(async (accId) => {
      const account = AccountStore.getAccountById(accId, userId);
      if (!account) {
        return {
          accountId: accId,
          status: 'FAILED',
          error: 'Account not found or disconnected'
        };
      }

      const platform = (account.platform || '').toLowerCase();

      try {
        let result;

        if (platform === 'linkedin') {
          const isImage = Boolean(
            mediaUrl && (
              mediaUrl.startsWith('data:image') ||
              mediaUrl.startsWith('data:') ||
              /\.(jpe?g|png|gif|webp|bmp|svg)(\?.*)?$/i.test(mediaUrl)
            )
          );
          const mediaType = isImage ? 'IMAGE' : (mediaUrl ? 'ARTICLE' : 'TEXT');

          result = await publishToLinkedIn({
            accessToken: account.token,
            authorUrn: account.platformUserId,
            content: content,
            mediaUrl: mediaUrl,
            mediaType: mediaType
          });

        } else if (platform === 'twitter' || platform === 'x') {
          // Parse stored token – may be a compound JSON or plain access token
          let tweetOpts = {};
          try {
            const parsed = JSON.parse(account.token);
            tweetOpts = {
              accessToken:       parsed.accessToken,
              accessTokenSecret: parsed.accessTokenSecret,
              consumerKey:       parsed.consumerKey,
              consumerSecret:    parsed.consumerSecret
            };
          } catch {
            // Plain access token stored (OAuth 2.0 bearer or legacy)
            tweetOpts = { accessToken: account.token };
          }

          result = await TwitterProvider.publishTweet({
            text: content,
            ...tweetOpts
          });

        } else if (platform === 'facebook') {
          result = await MetaProvider.publishToFacebookPage({
            pageId: account.platformUserId,
            pageToken: account.token,
            message: content,
            imageUrl: mediaUrl || undefined
          });

        } else if (platform === 'instagram') {
          result = await MetaProvider.publishToInstagram({
            igUserId: account.platformUserId,
            pageToken: account.token,
            caption: content,
            imageUrl: mediaUrl,
            authFlow: account.authFlow || 'facebook_login'
          });

        } else {
          throw new Error(`Platform "${account.platform}" is not yet supported for publishing.`);
        }

        const logEntry = {
          userId:      userId || 'user_default_admin',
          accountId:   account.id,
          accountName: account.name,
          platform:    platform,
          status:      'SUCCESS',
          platformPostId: result.postId,
          url:         result.url,
          mode:        result.mode || 'live',
          executedAt:  new Date().toISOString()
        };

        db.logs.unshift(logEntry);
        return logEntry;

      } catch (err) {
        const errorLog = {
          userId:      userId || 'user_default_admin',
          accountId:   account.id,
          accountName: account.name,
          platform:    platform,
          status:      'FAILED',
          error:       err.message,
          executedAt:  new Date().toISOString()
        };
        db.logs.unshift(errorLog);
        return errorLog;
      }
    });

    const results = await Promise.all(publishPromises);
    const hasFailures = results.some(r => r.status === 'FAILED');
    const allFailed   = results.every(r => r.status === 'FAILED');

    newPost.status      = allFailed ? 'FAILED' : hasFailures ? 'PARTIALLY_FAILED' : 'PUBLISHED';
    newPost.publishedAt = new Date().toISOString();
    newPost.results     = results;

    db.posts.unshift(newPost);
    saveStoreToDisk();
    return newPost;
  }

  static getPostsByUser(userId) {
    return db.posts.filter(p => !p.userId || p.userId === userId || userId === 'user_default_admin');
  }

  static getLogsByUser(userId) {
    return db.logs.filter(l => !l.userId || l.userId === userId || userId === 'user_default_admin');
  }
}
