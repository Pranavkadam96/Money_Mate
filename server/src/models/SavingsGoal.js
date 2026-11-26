import mongoose from 'mongoose';

const contributionSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: true,
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const savingsGoalSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Goal name is required'],
      trim: true,
      maxlength: [100, 'Goal name cannot exceed 100 characters'],
    },
    targetAmount: {
      type: Number,
      required: [true, 'Target amount is required'],
      min: [1, 'Target amount must be at least 1'],
    },
    savedAmount: {
      type: Number,
      default: 0,
      min: [0, 'Saved amount cannot be negative'],
    },
    targetDate: {
      type: Date,
      default: null,
    },
    category: {
      type: String,
      trim: true,
      default: 'General',
    },
    color: {
      type: String,
      default: '#2563EB',
    },
    contributions: {
      type: [contributionSchema],
      default: [],
    },
  },
  { timestamps: true }
);

export default mongoose.model('SavingsGoal', savingsGoalSchema);
