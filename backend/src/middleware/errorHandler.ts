import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/appError';

type AnyError = AppError | (Error & { statusCode?: number; isOperational?: boolean });

export const errorHandler = (
  err: AnyError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  const anyErr = err as unknown as Record<string, unknown>;
  const rawStatusCode = err instanceof AppError ? err.statusCode : anyErr.statusCode;
  const statusCode = typeof rawStatusCode === 'number' ? rawStatusCode : 500;
  // If a raw Error was thrown with a `statusCode`, treat it as operational so we preserve its payload.
  const isOperational = err instanceof AppError ? err.isOperational : anyErr.statusCode !== undefined;
  const message = isOperational ? err.message : 'Internal server error';

  if (process.env.NODE_ENV !== 'production') {
    console.error('[Error]', err.message, err.stack);
  }

  const body: Record<string, unknown> = { success: false, message };
  if (isOperational) {
    const errorCode = anyErr.error ?? anyErr.code;
    if (typeof errorCode === 'string') body.error = errorCode;
    if (anyErr.required !== undefined) body.required = anyErr.required;
    if (anyErr.available !== undefined) body.available = anyErr.available;
  }
  if (process.env.NODE_ENV === 'development') body.stack = err.stack;

  res.status(statusCode).json(body);
};

export const notFound = (_req: Request, res: Response): void => {
  res.status(404).json({ success: false, message: 'Route not found' });
};
