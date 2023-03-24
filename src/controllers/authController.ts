import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/userModel';
import { catchAsync } from '../utils/catchAsync';
import AppError from '../utils/appError';
import Email from '../utils/email';

interface DecodedToken {
  id: string;
  iat: number;
  exp: number;
}

interface CookieOptions {
  expires: Date;
  httpOnly: boolean;
  secure?: boolean;
}
export interface RequestWithUser extends Request {
  user?: IUser;
}

const signToken = (id: string): string => {
  return jwt.sign({ id: id }, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user: IUser, statusCode: number, res: Response) => {
  const token = signToken(user._id);

  const cookieOptions: CookieOptions = {
    expires: new Date(
      Date.now() +
        Number(process.env.JWT_COOKIE_EXPIRES_IN!) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' ? true : false,
  };

  res.cookie('jwt', token, cookieOptions);

  user.password = '';
  user.passwordConfirm = '';

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

export const signup = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const newUser = await User.create({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      passwordConfirm: req.body.passwordConfirm,
    });

    const url = `${req.protocol}://${req.get('host')}/me`;
    await new Email(newUser, url).sendWelcome();

    createSendToken(newUser, 201, res);
  }
);

export const login = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;

    // 1) Check if email and password exist
    if (!email || !password) {
      return next(new AppError('Please provide email and password!', 400));
    }

    // 2) Check if user exists && password is correct
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.correctPassword(password, user.password))) {
      return next(new AppError('Incorrect email or password', 401));
    }

    // 3) If everything ok, send token to client
    createSendToken(user, 200, res);
  }
);

export const logout = (req: Request, res: Response): void => {
  res.cookie('jwt', '', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: 'success' });
};

export const protect = catchAsync(
  async (req, res: Response, next: NextFunction) => {
    // 1) Getting token and check of it's there
    let token: string | undefined;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      return next(
        new AppError('You are not logged in! Please log in to get access.', 401)
      );
    }

    // 2) Verification token

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;

    // 3) Check if user still exists
    const currentUser = await User.findById(decoded.id);

    if (!currentUser) {
      return next(
        new AppError(
          'The user belonging to this token does no longer exist.',
          401
        )
      );
    }

    // 4) Check if user changed password after the token was issued
    if (
      currentUser &&
      currentUser.changedPasswordAfter &&
      currentUser.changedPasswordAfter(decoded.iat)
    ) {
      return next(
        new AppError(
          'User recently changed password! Please log in again.',
          401
        )
      );
    }

    // GRANT ACCESS TO PROTECTED ROUTE
    req.user = currentUser;
    res.locals.user = currentUser;
    next();
  }
);

// Only for rendered pages(for frontcheck), no errors!
export const isLoggedIn = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.cookies.jwt) {
    try {
      const decoded: any = await jwt.verify(
        req.cookies.jwt,
        process.env.JWT_SECRET!
      );

      const currentUser = (await User.findById(decoded.id)) as IUser;
      if (!currentUser) {
        return next();
      }

      if (
        currentUser &&
        currentUser.changedPasswordAfter &&
        currentUser.changedPasswordAfter(decoded.iat)
      ) {
        return next();
      }

      res.locals.user = currentUser;
      return next();
    } catch (err) {
      return next(err);
    }
  }
  next();
};

export const forgotPassword = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    // 1) Get user based on POSTed email
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      throw new AppError('There is no user with email address.', 404);
    }

    // 2) Generate the random reset token
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });
    try {
      // 3) Send it to user's email
      const resetURL = `${req.protocol}://${req.get(
        'host'
      )}/api/v1/users/resetPassword/${resetToken}`;
      await new Email(user, resetURL).sendPasswordReset();
      res.status(200).json({
        status: 'success',
        message: 'Token sent to email!',
      });
    } catch (err) {
      user.passwordResetToken = '';
      user.passwordResetExpires = new Date(Date.now() + 1000);
      await user.save({ validateBeforeSave: false });
      return next(
        new AppError(
          'There was an error sending the email. Try again later!',
          500
        )
      );
    }
  }
);

export const resetPassword = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    // Get user based on the token
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date(Date.now()) },
    });

    // If token has not expired, and there is user, set the new password
    if (!user) {
      return next(new AppError('Token is invalid or has expired', 400));
    }
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;

    user.passwordResetToken = '';
    user.passwordResetExpires = new Date(Date.now() + 1000);

    await user.save();

    // Log the user in, send JWT
    createSendToken(user, 200, res);
  }
);

export const updatePassword = catchAsync(
  async (req, res: Response, next: NextFunction) => {
    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return next(new AppError('User not found', 404));
    }
    // Check if POSTed current password is correct
    if (
      !(await user?.correctPassword(req.body.passwordCurrent, user.password))
    ) {
      return next(new AppError('Your current password is wrong.', 401));
    }

    // If so, update password
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    await user?.save();

    // Log user in, send JWT
    createSendToken(user, 200, res);
  }
);
