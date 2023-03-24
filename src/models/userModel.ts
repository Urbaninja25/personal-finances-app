import * as crypto from 'crypto';
import { Document, Model, Schema, ResolveSchemaOptions } from 'mongoose';
import mongoose from 'mongoose';

import * as validator from 'validator';
import * as bcrypt from 'bcryptjs';

export interface IUser extends Document {
  name: string;
  email: string;
  photo: string;
  role: string;
  password: string;
  passwordConfirm: string;
  createdAt: Date;
  passwordChangedAt: Date;
  passwordResetToken: string;
  passwordResetExpires: Date;
  active: boolean;
  changedPasswordAt?: Date;
  changedPasswordAfter?(JWTTimestamp: number): boolean;
  correctPassword(
    candidatePassword: string,
    userPassword: string
  ): Promise<boolean>;
  createPasswordResetToken(): string;
}

const userSchema: Schema<IUser> = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please tell us your name!'],
    },
    email: {
      type: String,
      // unique: true,
      required: [true, 'Please provide your email'],
      lowercase: true,
      validate: [validator.default.isEmail, 'Please provide a valid email'],
    },
    photo: {
      type: String,
      default: 'default.jpeg',
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: 10,
      select: false,
    },
    passwordConfirm: {
      type: String,
      required: [true, 'Please confirm your password'],
      validate: {
        validator: function (this: IUser, el: string): boolean {
          return el === this.password;
        },
        message: 'Passwords are not the same!',
      },
      select: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    active: {
      type: Boolean,
      default: true,
      //dont show these output to anyone
      select: false,
    },
  },
  {
    indexes: [{ category: 1, amount: -1 }],
  } as ResolveSchemaOptions<any>
);

//we use query middlware to prevent query be visible  when postman(client) request it მიუხედავად იმისა რო db ში დარჩება ეს field
userSchema.pre(/^find/, function (next) {
  console.log('hhv');
  this.find({ active: { $ne: false } });
  next();
});

userSchema.pre<IUser>('save', async function (next) {
  if (!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, 12);

  this.passwordConfirm = '';
  next();
});

userSchema.pre<IUser>('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();

  this.passwordChangedAt = new Date(Date.now() - 1000);
  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword: string,
  userPassword: string
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp: number) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      (this.passwordChangedAt.getTime() / 1000).toString(),
      10
    );

    return JWTTimestamp < changedTimestamp;
  }

  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000);

  return resetToken;
};

const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);

export default User;
