import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface ICategory extends Document {
  category: string;
  user: Types.ObjectId;
}

const categorySchema: Schema<ICategory> = new mongoose.Schema({
  category: {
    type: String,
    required: [true, 'Please provide a category.'],
    unique: true,
    trim: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'flow must belong to a user'],
  },
});

const Categories: Model<ICategory> = mongoose.model<ICategory>(
  'Category',
  categorySchema
);

export default Categories;
