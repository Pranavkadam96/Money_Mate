import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['budget_warning', 'budget_exceeded', 'goal_milestone', 'recurring', 'info'],
      default: 'info',
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    metaKey: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, metaKey: 1 });

export default mongoose.model('Notification', notificationSchema);
