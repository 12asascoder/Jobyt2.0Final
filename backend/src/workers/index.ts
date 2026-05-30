import { notificationWorker } from './notificationWorker';
import { recommendationWorker } from './recommendationWorker';

export const startWorkers = () => {
  console.log('[Workers] BullMQ Workers started');
  // Workers are initialized simply by importing them and keeping their references.
  return {
    notificationWorker,
    recommendationWorker,
  };
};

export const stopWorkers = async () => {
  await notificationWorker.close();
  await recommendationWorker.close();
};
