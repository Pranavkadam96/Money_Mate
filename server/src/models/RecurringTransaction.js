import mongoose from 'mongoose';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS } from '../constants/categories.js';

const ALL_CATEGORIES = [...new Set([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES])];

const recurringTransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['income', 'expense'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [0.01, 'Amount must be greater than 0'],
    },
    category: {
      type: String,
      required: true,
      enum: ALL_CATEGORIES,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    paymentMethod: {
      type: String,
      enum: PAYMENT_METHODS,
      default: 'UPI',
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly'],
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    nextRunDate: {
      type: Date,
      required: true,
      index: true,
    },
    lastRunDate: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model('RecurringTransaction', recurringTransactionSchema);
