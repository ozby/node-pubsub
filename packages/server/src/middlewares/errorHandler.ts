import { Request, Response } from 'express';
import logger from '../utils/logger';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
): void => {
  let statusCode = 500;
  let message = 'Internal Server Error';

  console.error(err);
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    try {
      message = JSON.parse(err.message);
    } catch {
      message = err.message;
    }
  }

  logger.error(`Error: ${message}`, {
    stack: err.stack,
    statusCode,
  });

  res.status(statusCode).json({
    status: 'error',
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}; 