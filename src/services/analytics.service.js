import { db } from './account.store.js';

export class AnalyticsService {
  static getOverview() {
    const totalPosts = db.posts.length;
    const publishedPosts = db.posts.filter(p => p.status === 'PUBLISHED').length;
    const scheduledPosts = db.posts.filter(p => p.status === 'SCHEDULED').length;
    const failedPosts = db.posts.filter(p => p.status === 'FAILED').length;

    const totalLogs = db.logs.length;
    const successfulLogs = db.logs.filter(l => l.status === 'SUCCESS').length;
    const successRate = totalLogs > 0 ? Math.round((successfulLogs / totalLogs) * 100) : 100;

    // Platform distribution
    const platformStats = {
      LINKEDIN: db.logs.filter(l => l.platform?.includes('LINKEDIN')).length,
      FACEBOOK: db.logs.filter(l => l.platform?.includes('FACEBOOK')).length,
      INSTAGRAM: db.logs.filter(l => l.platform?.includes('INSTAGRAM')).length,
      TWITTER: db.logs.filter(l => l.platform?.includes('TWITTER')).length
    };

    // Engagement simulations
    const simulatedImpressions = (publishedPosts * 450) + 1240;
    const simulatedClicks = Math.round(simulatedImpressions * 0.08);
    const simulatedEngagements = Math.round(simulatedImpressions * 0.12);

    return {
      success: true,
      summary: {
        totalPosts,
        publishedPosts,
        scheduledPosts,
        failedPosts,
        successRate: `${successRate}%`,
        impressions: simulatedImpressions.toLocaleString(),
        clicks: simulatedClicks.toLocaleString(),
        engagements: simulatedEngagements.toLocaleString()
      },
      platformStats
    };
  }
}
