import { Queue } from 'bullmq';
import { redisConnection, recommendationQueue, autoApplyQueue } from '../config/queue';
import pool from '../config/database';
import { AutoApplyPreferenceModel } from '../models/autoApplyPreference.model';

const LOG_PREFIX = '[DailyScheduler]';

// A generic scheduler queue to manage cron jobs
export const schedulerQueue = new Queue('schedulerQueue', {
  connection: redisConnection as any,
});

export const setupDailyScheduler = async () => {
  // Clear any existing repeatable jobs to avoid duplicates on restart
  const repeatableJobs = await schedulerQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    await schedulerQueue.removeRepeatableByKey(job.key);
  }

  // Schedule the daily run at 8:00 AM UTC
  await schedulerQueue.add(
    'runDailyRecommendations',
    {},
    {
      repeat: {
        pattern: '0 8 * * *', // Every day at 8:00 AM
      },
    }
  );

  await schedulerQueue.add(
    'runDailyAutoApply',
    {},
    {
      repeat: {
        pattern: '0 9 * * *',
      },
    },
  );

  await schedulerQueue.add(
    'expireAutoApplyApprovals',
    {},
    {
      repeat: {
        pattern: '0 * * * *',
      },
    },
  );

  console.log(`${LOG_PREFIX} Daily recommendation and Auto-Apply schedulers setup complete.`);
};

import { Worker, Job } from 'bullmq';

export const schedulerWorker = new Worker('schedulerQueue', async (job: Job) => {
  if (job.name === 'runDailyRecommendations') {
    console.log(`${LOG_PREFIX} Starting daily recommendations run...`);
    
    // Log the start
    const { rows: logRows } = await pool.query(
      `INSERT INTO scheduler_logs (status) VALUES ('started') RETURNING id`
    );
    const logId = logRows[0].id;

    try {
      // Fetch all applicant users who are verified (or just all applicants)
      // For scalability, in the future this should use a cursor/pagination.
      const { rows: users } = await pool.query(
        `SELECT id FROM users WHERE role = 'applicant'`
      );

      console.log(`${LOG_PREFIX} Found ${users.length} applicant users to process.`);

      // Enqueue them to recommendationQueue
      const jobs = users.map(u => ({
        name: 'generateForUser',
        data: { userId: u.id }
      }));

      // Add in chunks to avoid memory issues if 50k+
      const CHUNK_SIZE = 500;
      for (let i = 0; i < jobs.length; i += CHUNK_SIZE) {
        const chunk = jobs.slice(i, i + CHUNK_SIZE);
        await recommendationQueue.addBulk(chunk);
      }

      await pool.query(
        `UPDATE scheduler_logs SET status = 'completed', users_processed = $1, updated_at = NOW() WHERE id = $2`,
        [users.length, logId]
      );
      console.log(`${LOG_PREFIX} Daily recommendations run completed successfully.`);

    } catch (error: any) {
      console.error(`${LOG_PREFIX} Daily recommendations run failed:`, error);
      await pool.query(
        `UPDATE scheduler_logs SET status = 'failed', error_message = $1, updated_at = NOW() WHERE id = $2`,
        [error.message || 'Unknown error', logId]
      );
    }
  }
  if (job.name === 'runDailyAutoApply') {
    console.log(`${LOG_PREFIX} Starting daily Auto-Apply run...`);
    try {
      const userIds = await AutoApplyPreferenceModel.listEnabledUserIds();
      const today = new Date().toISOString().slice(0, 10);
      const matchJobs = userIds.map((userId) => ({
        name: 'matchForUser',
        data: { userId, trigger: 'scheduled' },
      }));
      const digestJobs = userIds.map((userId) => ({
        name: 'sendDigestForUser',
        data: { userId, date: today },
      }));

      const CHUNK_SIZE = 500;
      for (let i = 0; i < matchJobs.length; i += CHUNK_SIZE) {
        await autoApplyQueue.addBulk(matchJobs.slice(i, i + CHUNK_SIZE));
      }
      for (let i = 0; i < digestJobs.length; i += CHUNK_SIZE) {
        await autoApplyQueue.addBulk(digestJobs.slice(i, i + CHUNK_SIZE));
      }
      console.log(`${LOG_PREFIX} Enqueued Auto-Apply for ${userIds.length} users.`);
    } catch (error) {
      console.error(`${LOG_PREFIX} Daily Auto-Apply run failed:`, error);
      throw error;
    }
  }

  if (job.name === 'expireAutoApplyApprovals') {
    await autoApplyQueue.add('expirePendingApprovals', {});
  }
}, { connection: redisConnection as any });

schedulerWorker.on('failed', (job, err) => {
  console.error(`${LOG_PREFIX} Scheduler job ${job?.id} failed:`, err);
});
