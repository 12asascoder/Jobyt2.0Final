import { notificationWorker } from './notificationWorker';
import { recommendationWorker } from './recommendationWorker';
import { codingEvaluationWorker } from './codingEvaluationWorker';

export const startWorkers = () => {
  console.log('[Workers] BullMQ Workers started');
  return {
    notificationWorker,
    recommendationWorker,
    codingEvaluationWorker,
  };
};

export const stopWorkers = async () => {
  await notificationWorker.close();
  await recommendationWorker.close();
  await codingEvaluationWorker.close();
};
