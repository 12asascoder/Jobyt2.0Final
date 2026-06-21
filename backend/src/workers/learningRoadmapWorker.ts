import { Worker, Job } from 'bullmq';
import { RoadmapService } from '../services/learning/RoadmapService';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

export const LEARNING_QUEUE_NAME = 'learning-roadmap-queue';

// Configure Redis Connection
const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
};

export interface GenerateRoadmapPayload {
  candidateId: string;
  targetRole: string;
  experienceLevel?: string;
}

export const learningRoadmapWorker = new Worker<GenerateRoadmapPayload>(
  LEARNING_QUEUE_NAME,
  async (job: Job<GenerateRoadmapPayload>) => {
    logger.info(`Processing learning roadmap job ${job.id} for candidate ${job.data.candidateId}`);
    
    try {
      const roadmap = await RoadmapService.generateRoadmapForCandidate(
        job.data.candidateId,
        job.data.targetRole,
        job.data.experienceLevel || 'Beginner'
      );
      
      logger.info(`Successfully generated roadmap for candidate ${job.data.candidateId}`);
      return roadmap;
    } catch (error: any) {
      logger.error(`Failed to generate roadmap for candidate ${job.data.candidateId}: ${error.message}`);
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 5, // Limit concurrent LLM generations
    limiter: {
      max: 10,
      duration: 60000 // Rate limit to 10 generations per minute to avoid LLM overload
    }
  }
);

learningRoadmapWorker.on('completed', (job) => {
  logger.info(`Roadmap worker completed job ${job.id}`);
});

learningRoadmapWorker.on('failed', (job, err) => {
  logger.error(`Roadmap worker failed job ${job?.id}: ${err.message}`);
});
