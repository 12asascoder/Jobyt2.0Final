import { notificationWorker } from './notificationWorker';
import { recommendationWorker } from './recommendationWorker';
import { codingEvaluationWorker } from './codingEvaluationWorker';
import { autoApplyWorker } from './autoApplyWorker';

export const startWorkers = () => {
  console.log('[Workers] BullMQ Workers started');
  return {
    notificationWorker,
    recommendationWorker,
    codingEvaluationWorker,
    autoApplyWorker,
  };
};

export const stopWorkers = async () => {
  await notificationWorker.close();
  await recommendationWorker.close();
  await codingEvaluationWorker.close();
  await autoApplyWorker.close();
};
