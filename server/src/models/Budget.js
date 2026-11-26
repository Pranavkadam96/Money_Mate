import mongoose from 'mongoose';
import { EXPENSE_CATEGORIES } from '../constants/categories.js';

const categoryLimitSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: EXPENSE_CATEGORIES,
      required: true,
    },
    limit: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const budgetSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: true,
      min: 2000,
      max: 2100,
    },
    totalLimit: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    categoryLimits: {
      type: [categoryLimitSchema],
      default: [],
    },
  },
  { timestamps: true }
);

budgetSchema.index({ user: 1, month: 1, year: 1 }, { unique: true });

export default mongoose.model('Budget', budgetSchema);
