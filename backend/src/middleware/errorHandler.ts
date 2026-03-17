import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/appError';

type AnyError = AppError | (Error & { statusCode?: number; isOperational?: boolean });

export const errorHandler = (
  err: AnyError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  const statusCode = err instanceof AppError ? err.statusCode : (err.statusCode ?? 500);
  const isOperational = err instanceof AppError ? err.isOperational : !!err.isOperational;
  const message = isOperational ? err.message : 'Internal server error';

  if (process.env.NODE_ENV !== 'production') {
    console.error('[Error]', err.message, err.stack);
  }

  const body: Record<string, unknown> = { success: false, message };
  if (process.env.NODE_ENV === 'development') body.stack = err.stack;

  res.status(statusCode).json(body);
};

export const notFound = (_req: Request, res: Response): void => {
  res.status(404).json({ success: false, message: 'Route not found' });
};
