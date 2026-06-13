import { notificationWorker } from './notificationWorker';
import { recommendationWorker } from './recommendationWorker';
import { bulkInterviewWorker } from './bulkInterviewWorker';

export const startWorkers = () => {
  console.log('[Workers] BullMQ Workers started');
  // Workers are initialized simply by importing them and keeping their references.
  return {
    notificationWorker,
    recommendationWorker,
    bulkInterviewWorker,
  };
};

export const stopWorkers = async () => {
  await notificationWorker.close();
  await recommendationWorker.close();
  await bulkInterviewWorker.close();
};

