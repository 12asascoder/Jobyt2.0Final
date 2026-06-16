import { notificationWorker } from './notificationWorker';
import { recommendationWorker } from './recommendationWorker';
import { webhookWorker } from './webhookWorker';
import { codingEvaluationWorker } from './codingEvaluationWorker';

export const startWorkers = () => {
  console.log('[Workers] BullMQ Workers started');
  return {
    notificationWorker,
    recommendationWorker,
    webhookWorker,
    codingEvaluationWorker,
  };
};

export const stopWorkers = async () => {
  await notificationWorker.close();
  await recommendationWorker.close();
  await webhookWorker.close();
  await codingEvaluationWorker.close();
};
