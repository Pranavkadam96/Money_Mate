import express from 'express';
import SavingsGoal from '../models/SavingsGoal.js';
import Notification from '../models/Notification.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

function formatGoal(goal) {
  const target = Number(goal.targetAmount) || 1;
  const saved = Number(goal.savedAmount) || 0;
  const progressPercent = Math.min(100, Math.round((saved / target) * 1000) / 10);
  const remainingAmount = Math.max(0, target - saved);
  return {
    ...goal.toObject(),
    progressPercent,
    remainingAmount,
    isCompleted: saved >= target,
  };
}

// GET /api/goals
router.get('/', async (req, res, next) => {
  try {
    const goals = await SavingsGoal.find({ user: req.user._id }).sort({ createdAt: -1 });
    const formatted = goals.map(formatGoal);
    const totalTarget = formatted.reduce((s, g) => s + g.targetAmount, 0);
    const totalSaved = formatted.reduce((s, g) => s + g.savedAmount, 0);

    res.json({
      goals: formatted,
      summary: {
        totalTarget,
        totalSaved,
        totalRemaining: Math.max(0, totalTarget - totalSaved),
        overallProgress: totalTarget > 0 ? Math.min(100, Math.round((totalSaved / totalTarget) * 1000) / 10) : 0,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/goals
router.post('/', async (req, res, next) => {
  try {
    const { name, targetAmount, savedAmount = 0, targetDate = null, category = 'General', color = '#2563EB' } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Goal name is required.' });
    }
    const target = Number(targetAmount);
    const saved = Number(savedAmount);
    if (Number.isNaN(target) || target <= 0) {
      return res.status(400).json({ message: 'Target amount must be greater than 0.' });
    }
    if (Number.isNaN(saved) || saved < 0) {
      return res.status(400).json({ message: 'Initial saved amount cannot be negative.' });
    }

    const contributions = saved > 0 ? [{ amount: saved, note: 'Initial deposit', date: new Date() }] : [];

    const goal = await SavingsGoal.create({
      user: req.user._id,
      name: name.trim(),
      targetAmount: target,
      savedAmount: saved,
      targetDate: targetDate ? new Date(targetDate) : null,
      category: String(category || 'General').trim(),
      color,
      contributions,
    });

    res.status(201).json({ goal: formatGoal(goal) });
  } catch (err) {
    next(err);
  }
});

// PUT /api/goals/:id
router.put('/:id', async (req, res, next) => {
  try {
    const goal = await SavingsGoal.findOne({ _id: req.params.id, user: req.user._id });
    if (!goal) {
      return res.status(404).json({ message: 'Savings goal not found.' });
    }

    const { name, targetAmount, savedAmount, targetDate, category, color } = req.body;
    if (name !== undefined) {
      if (!name.trim()) return res.status(400).json({ message: 'Goal name cannot be empty.' });
      goal.name = name.trim();
    }
    if (targetAmount !== undefined) {
      const t = Number(targetAmount);
      if (Number.isNaN(t) || t <= 0) return res.status(400).json({ message: 'Target amount must be > 0.' });
      goal.targetAmount = t;
    }
    if (savedAmount !== undefined) {
      const s = Number(savedAmount);
      if (Number.isNaN(s) || s < 0) return res.status(400).json({ message: 'Saved amount cannot be negative.' });
      goal.savedAmount = s;
    }
    if (targetDate !== undefined) {
      goal.targetDate = targetDate ? new Date(targetDate) : null;
    }
    if (category !== undefined) goal.category = String(category).trim();
    if (color !== undefined) goal.color = color;

    await goal.save();
    res.json({ goal: formatGoal(goal) });
  } catch (err) {
    next(err);
  }
});

// POST /api/goals/:id/contribute
router.post('/:id/contribute', async (req, res, next) => {
  try {
    const goal = await SavingsGoal.findOne({ _id: req.params.id, user: req.user._id });
    if (!goal) {
      return res.status(404).json({ message: 'Savings goal not found.' });
    }

    const amount = Number(req.body.amount);
    if (Number.isNaN(amount) || amount === 0) {
      return res.status(400).json({ message: 'Contribution amount must be non-zero.' });
    }

    const prevPct = (goal.savedAmount / goal.targetAmount) * 100;
    const nextSaved = Math.max(0, goal.savedAmount + amount);
    goal.savedAmount = nextSaved;
    goal.contributions.unshift({
      amount,
      note: String(req.body.note || (amount > 0 ? 'Contribution added' : 'Withdrawal')).trim(),
      date: new Date(),
    });
    await goal.save();

    const newPct = (goal.savedAmount / goal.targetAmount) * 100;
    if (prevPct < 100 && newPct >= 100) {
      await Notification.create({
        user: req.user._id,
        title: `Savings Goal Achieved: ${goal.name}!`,
        message: `Congratulations! You reached 100% of your "${goal.name}" savings goal.`,
        type: 'goal_milestone',
      });
    } else if (prevPct < 50 && newPct >= 50) {
      await Notification.create({
        user: req.user._id,
        title: `Halfway to ${goal.name}!`,
        message: `You've saved ${newPct.toFixed(0)}% toward your "${goal.name}" goal.`,
        type: 'goal_milestone',
      });
    }

    res.json({ goal: formatGoal(goal) });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/goals/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await SavingsGoal.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!deleted) {
      return res.status(404).json({ message: 'Savings goal not found.' });
    }
    res.json({ message: 'Savings goal deleted.' });
  } catch (err) {
    next(err);
  }
});

export default router;
