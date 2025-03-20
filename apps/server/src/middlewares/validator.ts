import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { AppError } from './errorHandler';

export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }
    const formattedErrors = errors.array().map(error => ({
      message: error.msg
    }));

    next(new AppError(JSON.stringify(formattedErrors), 400));
  };
};

export const validateMessageSchema = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const schema = {
      type: 'object',
      properties: {
        data: { type: 'object' },
      },
      required: ['data'],
    };

    if (schema.required && Array.isArray(schema.required)) {
      for (const field of schema.required) {
        if (!(field in req.body)) {
          throw new AppError(`Required field '${field}' is missing`, 400);
        }
      }
    }

    next();
  } catch (error) {
    next(error);
  }
}; 