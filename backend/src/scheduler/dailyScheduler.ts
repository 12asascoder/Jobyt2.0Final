import { Queue } from 'bullmq';
import { redisConnection, recommendationQueue } from '../config/queue';
import pool from '../config/database';
import { AutoApplyService } from '../services/autoApply.service';

const LOG_PREFIX = '[DailyScheduler]';

// A generic scheduler queue to manage cron jobs
export const schedulerQueue = new Queue('schedulerQueue', {
  connection: redisConnection,
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

  // Schedule the daily auto-apply processing at 8:00 AM UTC
  await schedulerQueue.add(
    'runDailyAutoApply',
    {},
    {
      repeat: {
        pattern: '0 8 * * *', // Every day at 8:00 AM
      },
    }
  );

  console.log(`${LOG_PREFIX} Daily recommendation and auto-apply scheduler setup complete.`);
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
  } else if (job.name === 'runDailyAutoApply') {
    console.log(`${LOG_PREFIX} Starting daily auto-apply processing...`);
    try {
      // Find all active auto-apply users
      const { rows: activeUsers } = await pool.query(
        `SELECT user_id FROM auto_apply_preferences WHERE is_active = true`
      );

      console.log(`${LOG_PREFIX} Found ${activeUsers.length} active auto-apply users.`);

      let totalApplied = 0;
      for (const u of activeUsers) {
        try {
          // Pre-scan matching jobs so the queue is fresh
          await AutoApplyService.matchJobsForUser(u.user_id);
          const count = await AutoApplyService.processPendingApplies(u.user_id);
          totalApplied += count;
        } catch (err) {
          console.error(`${LOG_PREFIX} Failed auto-apply for user ${u.user_id}:`, err);
        }
      }
      console.log(`${LOG_PREFIX} Daily auto-apply run completed. Total applications submitted: ${totalApplied}`);
    } catch (error: any) {
      console.error(`${LOG_PREFIX} Daily auto-apply run failed:`, error);
    }
  }
}, { connection: redisConnection });

schedulerWorker.on('failed', (job, err) => {
  console.error(`${LOG_PREFIX} Scheduler job ${job?.id} failed:`, err);
});
