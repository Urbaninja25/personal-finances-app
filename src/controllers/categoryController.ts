import { Types } from 'mongoose';
import { Request, Response, NextFunction } from 'express';
import Categories, { ICategory } from '../models/categoryModel';
import { CategoryRequest, catchAsync } from '../utils/catchAsync';
import AppError from '../utils/appError';
import Flow from '../models/flowModel';

export const createCategory = catchAsync(
  async (req: CategoryRequest, res: Response, next: NextFunction) => {
    const categoryData: ICategory = req.body;
    categoryData.user = new Types.ObjectId(req.user._id);

    const doc = await Categories.create(categoryData);

    res.status(201).json({
      status: 'success',

      data: {
        data: doc,
      },
    });
  }
);

export const renameCategory = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    // Find the document in Categories collection with the given ID
    const categoryDoc = await Categories.findById(req.params.id);
    if (!categoryDoc) {
      return next(new AppError('No document found with that ID', 404));
    }
    const oldCategory = categoryDoc.category; // Store the old name in a variable

    // Update the name field with the new value
    categoryDoc.category = req.body.category;
    await categoryDoc.save();

    // Find all documents in the Flow collection with the old name and update their name fields
    const flowDocs = await Flow.updateMany(
      { category: oldCategory },
      { category: req.body.category },
      { runValidators: true }
    );
    if (!flowDocs) {
      return next(new AppError('No documents found with the old name', 404));
    }

    res.status(201).json({
      status: 'success',
      data: {
        categoryDoc,
        flowDocs,
      },
    });
  }
);

export const deleteCategory = catchAsync(
  async (req: CategoryRequest, res: Response, next: NextFunction) => {
    // Get the category from the categories model
    const categories = await Categories.findById(req.params.id.trim());
    if (!categories) {
      return next(new AppError('No document found with that ID', 404));
    }
    const { category } = categories;
    console.log(category);

    // Update the category to "default" in all the documents
    const updatedFlows = await Flow.updateMany(
      { category: category },
      { $set: { category: `default` } }
    );

    // Delete the category from the Categories model
    await categories.delete();

    // Return the updated documents in the response
    res.status(201).json({
      status: 'success',
      data: {
        updatedFlows,
      },
    });
  }
);
