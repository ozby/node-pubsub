import mongoose, { CallbackError, Schema } from 'mongoose';
import { IUser } from '@repo/types';
import crypto from 'crypto';

export interface UserDocument extends IUser {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<UserDocument>(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      minlength: 3,
      maxlength: 50,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address.'],
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.password;
        return ret;
      },
    },
  }
);

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const hash = crypto
      .createHash('sha256')
      .update(this.password + 'some-salt')
      .digest('hex');
    this.password = hash;
    next();
  } catch (error) {
    next(error as CallbackError);
  }
});

UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  const hash = crypto
    .createHash('sha256')
    .update(candidatePassword + 'some-salt')
    .digest('hex');
  return this.password === hash;
};

export default mongoose.model<UserDocument>('User', UserSchema); 