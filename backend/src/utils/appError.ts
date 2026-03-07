export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational = true;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export const notFound = (resource = 'Resource') =>
  new AppError(`${resource} not found`, 404);

export const forbidden = () => new AppError('Access denied', 403);

export const conflict = (message: string) => new AppError(message, 409);

export const badRequest = (message: string) => new AppError(message, 400);

export const unauthorized = (message = 'Invalid credentials') =>
  new AppError(message, 401);
