import { Request, Response, NextFunction } from 'express';
import multer, { FileFilterCallback } from 'multer';
import sharp from 'sharp';
import { Document as UserDocument } from 'mongoose';
import { catchAsync } from '../utils/catchAsync';
import { RequestWithUser } from '../controllers/authController';
import AppError from '../utils/appError';
import User, { IUser } from '../models/userModel';
import APIFeatures from '../utils/apiFeatures';

type AllowedFields<T> = Array<keyof T>;

// these way img save as buffer
const multerStorage = multer.memoryStorage();
const multerFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

// configure multer upload
const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

export const uploadUserPhoto = upload.single('photo');

export const resizeUserPhoto = catchAsync(
  async (req, res: Response, next: NextFunction) => {
    if (!req.file) return next();

    const user = req.user as UserDocument;
    req.file.filename = `user-${user.id}-${Date.now()}.jpeg`;

    // that buffer is available like that ,- req.file.buffer
    await sharp(req.file.buffer)
      // spesify width and hight
      .resize(500, 500)
      // choose format
      .toFormat('jpeg')
      // compress little bit
      .jpeg({ quality: 90 })
      // in the end finally want to write it to a file on our disk
      .toFile(`public/img/users/${req.file.filename}`);

    next();
  }
);

const filterObj = <T extends Record<string, any>>(
  obj: T,
  ...allowedFields: AllowedFields<T>
): Partial<T> => {
  const newObj: Partial<T> = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el as keyof T)) newObj[el as keyof T] = obj[el];
  });
  return newObj;
};

export const getMe = (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
): void => {
  req.params.id = req.user?.id;
  next();
};

export const updateMe = catchAsync(
  async (req, res: Response, next: NextFunction): Promise<void> => {
    // 1) Create error if user POSTs password data
    if (req.body.password || req.body.passwordConfirm) {
      return next(
        new AppError(
          'This route is not for password updates. Please use /updateMyPassword.',
          400
        )
      );
    }

    // 2) Filtered out unwanted fields names that are not allowed to be updated
    const filteredBody = filterObj(req.body, 'name', 'email');
    if (req.file) filteredBody.photo = req.file.filename;

    // 3) Update user document
    const updatedUser = (await User.findByIdAndUpdate(
      req.user._id,
      filteredBody,
      {
        new: true,
        runValidators: true,
      }
    )) as IUser;

    res.status(200).json({
      status: 'success',
      data: {
        user: updatedUser,
      },
    });
  }
);

export const deleteMe = catchAsync(
  async (req, res: Response, next: NextFunction): Promise<void> => {
    await User.findByIdAndUpdate(req.user?._id, { active: false });

    res.status(204).json({
      status: 'success',
      data: null,
    });
  }
);

export const getAllUsers = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    // To allow for nested GET reviews on tour (hack).
    let filter: { tour?: string } = {};
    if (req.params.tourId) filter = { tour: req.params.tourId };

    const features = new APIFeatures(User.find(filter), req.query)
      .filter()
      .sort()
      .limitFields();

    const doc = await features.query;

    // SEND RESPONSE
    res.status(200).json({
      status: 'success',
      results: doc.length,
      data: {
        data: doc,
      },
    });
  }
);

export const getOne = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    let query = User.findById(req.params.id);
    const doc = await query;
    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  }
);
