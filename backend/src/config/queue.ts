import { Queue, QueueOptions } from 'bullmq';
import IORedis from 'ioredis';

const connectionOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // Required by BullMQ
};

// We create a new connection since BullMQ needs `maxRetriesPerRequest: null` 
// and specific handling.
export const redisConnection = new IORedis(connectionOptions);

const defaultQueueOptions: QueueOptions = {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: false,
  },
};

// Queue for processing daily recommendations
export const recommendationQueue = new Queue('recommendationQueue', defaultQueueOptions);

// Queue for sending email/whatsapp notifications
export const notificationQueue = new Queue('notificationQueue', defaultQueueOptions);

export const closeQueues = async () => {
  await recommendationQueue.close();
  await notificationQueue.close();
};
