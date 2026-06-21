import pool from '../config/database';
import winston from 'winston';
import { NotificationService } from './notification.service';
import { ScreeningService } from './ai/ScreeningService';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

export const DigestService = {
  /**
   * Aggregates daily applications and sends a digest to recruiters.
   */
  async sendDailyDigests(): Promise<void> {
    try {
      // 1. Fetch all recruiters who have digest_enabled
      const { rows: employers } = await pool.query(
        `SELECT recruiter_id FROM employer_settings WHERE digest_enabled = true`
      );

      for (const employer of employers) {
        // 2. Fetch jobs for this recruiter
        const { rows: jobs } = await pool.query(
          `SELECT id, title FROM jobs WHERE recruiter_id = $1`,
          [employer.recruiter_id]
        );

        if (jobs.length === 0) continue;

        let totalNewApps = 0;
        let topRecommendations = 0;
        let digestBody = "Here is your daily AI Screening Digest:\n\n";

        // 3. For each job, count applications in the last 24 hours
        for (const job of jobs) {
          const { rows: stats } = await pool.query(
            `SELECT count(*) as count, 
                    sum(case when ai_recommended = true then 1 else 0 end) as recommended
             FROM applications 
             WHERE job_id = $1 AND created_at >= NOW() - INTERVAL '24 hours'`,
            [job.id]
          );

          const count = parseInt(stats[0].count) || 0;
          const recommended = parseInt(stats[0].recommended) || 0;

          if (count > 0) {
            totalNewApps += count;
            topRecommendations += recommended;
            digestBody += `- **${job.title}**: ${count} new applications, ${recommended} top recommended.\n`;
          }
        }

        if (totalNewApps > 0) {
          digestBody += `\nTotal: ${totalNewApps} new applicants, ${topRecommendations} highly recommended candidates waiting for your review.`;

          // 4. Send Notification
          await NotificationService.send(
            employer.recruiter_id,
            'SYSTEM' as any, // Cast assuming valid type
            'Daily Screening Digest',
            digestBody,
            '/employer/dashboard'
          );

          logger.info(`Sent digest to recruiter ${employer.recruiter_id} with ${totalNewApps} apps.`);
        }
      }
    } catch (error: any) {
      logger.error(`Failed to send daily digests: ${error.message}`);
    }
  }
};
