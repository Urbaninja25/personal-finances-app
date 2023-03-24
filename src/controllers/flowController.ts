import { Request, Response, NextFunction } from 'express';
import { catchAsync, CategoryRequest } from '../utils/catchAsync';
import Flow, { IFlow } from '../models/flowModel';
import APIFeatures from '../utils/apiFeatures';
import Categories from '../models/categoryModel';
import AppError from '../utils/appError';
import { Types } from 'mongoose';

export const createOne = catchAsync(
  async (req: CategoryRequest, res: Response, next: NextFunction) => {
    const flowData: IFlow = req.body;
    flowData.user = new Types.ObjectId(req.user?._id);

    // Check if category exists in Categories model
    await Categories.findOneAndUpdate(
      { category: req.body.category },
      {
        $setOnInsert: {
          category: req.body.category,
          user: new Types.ObjectId(req.user?._id),
        },
      },
      { upsert: true }
    );

    // If chart is "expense" and status is not provided, return error message
    if (flowData.chart === 'expense' && !flowData.status) {
      next(new AppError('Expenses must have a status field', 404));
    }

    // If chart is not "expense" and status is provided, return error message

    if (flowData.chart !== 'expense' && flowData.status) {
      next(new AppError('Status is not allowed for non-expense flows', 404));
    }

    const doc = await Flow.create(flowData);

    res.status(201).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  }
);

export const getAll = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const features = new APIFeatures(Flow.find(), req.query)
      .filter()
      .sort()
      .limitFields();

    const doc = await features.query;
    if (doc.length === 0) {
      return next(
        new AppError(
          'No document found with that query, please double check your params',
          404
        )
      );
    }
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

export const getFlowStats = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const stats = await Flow.aggregate([
      {
        $group: {
          _id: {
            category: '$category',
            chart: '$chart',
          },
          maxAmount: { $max: '$amount' },
          minAmount: { $min: '$amount' },
        },
      },
      {
        $sort: { '_id.chart': 1 },
      },
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        stats,
      },
    });
  }
);
