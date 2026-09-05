import { PostService } from './post.service.js';
import { db } from './account.store.js';

export class SchedulerService {
  static scheduledQueue = [];

  /**
   * Schedule a post for future execution
   */
  static schedulePost({ content, mediaUrl, accountIds, scheduledAt }) {
    const scheduledTime = new Date(scheduledAt);
    const now = new Date();

    if (isNaN(scheduledTime.getTime()) || scheduledTime <= now) {
      throw new Error('Scheduled date must be a valid future timestamp.');
    }

    const job = {
      id: `job_${Date.now()}`,
      content,
      mediaUrl,
      accountIds,
      scheduledAt: scheduledTime.toISOString(),
      status: 'SCHEDULED',
      createdAt: new Date().toISOString()
    };

    SchedulerService.scheduledQueue.push(job);

    // Also add to post list as SCHEDULED
    db.posts.unshift({
      id: job.id,
      content,
      mediaUrl,
      status: 'SCHEDULED',
      scheduledAt: job.scheduledAt,
      createdAt: job.createdAt,
      results: []
    });

    const delayMs = scheduledTime.getTime() - now.getTime();
    
    // Set timer for execution
    setTimeout(async () => {
      console.log(`[Scheduler] ⏰ Triggering scheduled post job: ${job.id}`);
      try {
        const publishedPost = await PostService.publishToMultipleAccounts({
          content: job.content,
          mediaUrl: job.mediaUrl,
          accountIds: job.accountIds
        });
        job.status = publishedPost.status;
        
        // Update post item in db
        const existingPost = db.posts.find(p => p.id === job.id);
        if (existingPost) {
          existingPost.status = publishedPost.status;
          existingPost.publishedAt = new Date().toISOString();
          existingPost.results = publishedPost.results;
        }
      } catch (err) {
        console.error(`[Scheduler] ❌ Job ${job.id} failed:`, err);
        job.status = 'FAILED';
      }
    }, delayMs);

    return job;
  }

  static getScheduledJobs() {
    return SchedulerService.scheduledQueue;
  }
}
