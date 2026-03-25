import { AppError } from './errors';

export { AppError };

export const notFound = (resource = 'Resource') => new AppError(`${resource} not found`, 404, 'NOT_FOUND');

export const forbidden = () => new AppError('Access denied', 403, 'FORBIDDEN');

export const conflict = (message: string) => new AppError(message, 409, 'CONFLICT');

export const badRequest = (message: string) => new AppError(message, 400, 'BAD_REQUEST');

export const unauthorized = (message = 'Invalid credentials') =>
  new AppError(message, 401, 'UNAUTHORIZED');
