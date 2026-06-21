import { Worker, Job } from 'bullmq';
import { redisConnection, notificationQueue } from '../config/queue';
import { AutoApplyQueueService } from '../services/autoApplyQueue.service';
import { AutoApplyQueueModel } from '../models/autoApplyQueue.model';
import pool from '../config/database';

const LOG_PREFIX = '[AutoApplyWorker]';

export const autoApplyWorker = new Worker(
  'autoApplyQueue',
  async (job: Job) => {
    if (job.name === 'matchForUser') {
      const { userId, trigger = 'scheduled' } = job.data as { userId: string; trigger?: string };
      await AutoApplyQueueService.matchForUser(userId, trigger);
      return;
    }

    if (job.name === 'tailorAndSubmit') {
      const { userId, jobId, queueItemId } = job.data as {
        userId: string;
        jobId: string;
        queueItemId: string;
      };
      await AutoApplyQueueService.tailorAndSubmit(userId, jobId, queueItemId);
      return;
    }

    if (job.name === 'expirePendingApprovals') {
      const count = await AutoApplyQueueModel.expirePendingApprovals();
      console.log(`${LOG_PREFIX} Expired ${count} pending approvals`);
      return;
    }

    if (job.name === 'sendDigestForUser') {
      const { userId, date } = job.data as { userId: string; date: string };
      const { rows: stats } = await pool.query(
        `SELECT status, COUNT(*)::int AS count
         FROM auto_apply_queue_items
         WHERE user_id = $1 AND created_at::date = $2::date
         GROUP BY status`,
        [userId, date],
      );
      const summary: Record<string, number> = {};
      for (const row of stats) summary[String(row.status)] = Number(row.count);

      await notificationQueue.add('sendAutoApplyDigest', { userId, date, summary });
      return;
    }
  },
  { connection: redisConnection, concurrency: 3 },
);

autoApplyWorker.on('completed', (job) => {
  console.log(`${LOG_PREFIX} Job ${job.id} completed`);
});

autoApplyWorker.on('failed', (job, err) => {
  console.error(`${LOG_PREFIX} Job ${job?.id} failed:`, err.message);
});
