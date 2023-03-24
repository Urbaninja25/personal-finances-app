import { Document, Model, Schema, Types, ResolveSchemaOptions } from 'mongoose';
import mongoose from 'mongoose';

export interface IFlow extends Document {
  category: string;
  chart: string;
  description: string;
  amount: number;
  status?: string;
  createdAt?: Date;
  user: Types.ObjectId;
}

const flowSchema: Schema<IFlow> = new mongoose.Schema(
  {
    category: {
      type: String,
      required: [true, 'Please provide a category.'],
      trim: true,
      default: 'default',
    },
    chart: {
      type: String,
      required: [true, 'Please choose a flow chart category.'],
      enum: {
        values: ['income', 'expense'],
        message: ' must be either "income" or "expenses".',
      },
    },
    description: {
      type: String,
      required: [true, 'Please provide a description.'],
      trim: true,
      maxlength: [
        100,
        'A description must have less or equal than 100 characters.',
      ],
    },
    amount: {
      type: Number,
      required: [true, 'Please provide an amount.'],
      min: [0, 'Amount must be greater or equal to 0.'],
    },
    status: {
      type: String,
      enum: {
        values: ['Processing', 'Completed'],
        message: 'Status must be either "Processing" or "Completed".',
      },
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'flow must belong to a user'],
    },
  },
  {
    indexes: [{ category: 1, amount: -1 }],
  } as ResolveSchemaOptions<any>
);

const Flow: Model<IFlow> = mongoose.model<IFlow>('Flows', flowSchema);

export default Flow;
