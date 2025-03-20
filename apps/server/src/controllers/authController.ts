import { Request, Response, NextFunction } from 'express';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import User from '../models/User';
import { AppError } from '../middlewares/errorHandler';
import config from '../config';
import logger from '../utils/logger';
import { LoginCredentials, RegisterCredentials } from '@ozby-pubsub/types';

const generateToken = (userId: string, username: string): string => {
  const payload = { userId, username };
  const secret = config.jwt.secret as Secret;
  const options = { expiresIn: config.jwt.expiresIn } as SignOptions;
  
  return jwt.sign(payload, secret, options);
};

export const register = async (req: Request<object, object, RegisterCredentials>, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { username, email, password } = req.body;

    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      throw new AppError('Username or email already exists', 400);
    }

    const user = await User.create({
      username,
      email,
      password,
    });

    const token = generateToken(user.id, user.username);

    logger.info(`User registered: ${user.id}`);

    res.status(201).json({
      status: 'success',
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request<object, object, LoginCredentials>, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new AppError('Invalid credentials', 401);
    }

    const token = generateToken(user.id, user.username);

    logger.info(`User logged in: ${user.id}`);

    res.status(200).json({
      status: 'success',
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getCurrentUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError('Not authenticated', 401);
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.status(200).json({
      status: 'success',
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
}; 