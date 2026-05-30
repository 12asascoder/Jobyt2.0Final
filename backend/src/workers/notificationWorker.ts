import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/queue';
import { sendEmail, dailyRecommendationEmailHtml } from '../utils/email';
import { WhatsAppService } from '../services/whatsapp.service';
import pool from '../config/database';

const LOG_PREFIX = '[NotificationWorker]';

export const notificationWorker = new Worker('notificationQueue', async (job: Job) => {
  const { userId, jobs } = job.data;
  
  if (job.name === 'sendDailyNotification') {
    try {
      // 1. Fetch user to check preferences and get contact info
      const { rows } = await pool.query(
        'SELECT email, phone, name, email_alerts_enabled, whatsapp_alerts_enabled FROM users u LEFT JOIN applicant_profiles ap ON u.id = ap.user_id WHERE u.id = $1',
        [userId]
      );
      
      if (rows.length === 0) return;
      const user = rows[0];
      const name = user.name || 'Candidate';

      let emailFailed = false;
      let whatsappFailed = false;

      // 2. Send Email if enabled
      if (user.email_alerts_enabled && user.email) {
        try {
          const html = dailyRecommendationEmailHtml(name, jobs);
          await sendEmail({
            to: user.email,
            subject: 'Your Daily Job Recommendations',
            html
          });
        } catch (error) {
          console.error(`${LOG_PREFIX} Failed to send email to ${user.email}`, error);
          emailFailed = true;
        }
      }

      // 3. Send WhatsApp if enabled
      if (user.whatsapp_alerts_enabled && user.phone) {
        try {
          await WhatsAppService.sendDailyRecommendations(user.phone, jobs);
        } catch (error) {
          console.error(`${LOG_PREFIX} Failed to send WhatsApp to ${user.phone}`, error);
          whatsappFailed = true;
        }
      }

      // 4. Update status in job_recommendations
      if (!emailFailed && !whatsappFailed) {
        const jobIds = jobs.map((j: any) => j.id);
        if (jobIds.length > 0) {
          await pool.query(
            `UPDATE job_recommendations SET status = 'sent' WHERE user_id = $1 AND job_id = ANY($2::uuid[])`,
            [userId, jobIds]
          );
        }
      } else {
        // If either failed and were supposed to be sent, we can throw to trigger a retry
        // But throwing will retry both. For simplicity, we just throw if any failed.
        throw new Error('Failed to send one or more notifications');
      }

    } catch (error) {
      console.error(`${LOG_PREFIX} Error processing job ${job.id}`, error);
      throw error;
    }
  }
}, { connection: redisConnection });

notificationWorker.on('completed', job => {
  console.log(`${LOG_PREFIX} Job ${job.id} has completed!`);
});

notificationWorker.on('failed', (job, err) => {
  console.error(`${LOG_PREFIX} Job ${job?.id} has failed with ${err.message}`);
});
