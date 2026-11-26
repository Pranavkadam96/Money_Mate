import express from 'express';
import RecurringTransaction from '../models/RecurringTransaction.js';
import { protect } from '../middleware/auth.js';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS } from '../constants/categories.js';
import { processDueRecurringForUser } from '../utils/recurringProcessor.js';

const router = express.Router();
router.use(protect);

// GET /api/recurring
router.get('/', async (req, res, next) => {
  try {
    const items = await RecurringTransaction.find({ user: req.user._id }).sort({ nextRunDate: 1 });
    res.json({ recurring: items });
  } catch (err) {
    next(err);
  }
});

// POST /api/recurring
router.post('/', async (req, res, next) => {
  try {
    const { type, amount, category, description, paymentMethod = 'UPI', frequency = 'monthly', startDate } =
      req.body;

    if (!['income', 'expense'].includes(type)) {
      return res.status(400).json({ message: 'Type must be income or expense.' });
    }
    const numAmount = Number(amount);
    if (Number.isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than 0.' });
    }
    const allowedCats = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    if (!allowedCats.includes(category)) {
      return res.status(400).json({ message: 'Invalid category.' });
    }
    if (!description || !description.trim()) {
      return res.status(400).json({ message: 'Description is required.' });
    }
    if (!['daily', 'weekly', 'monthly', 'yearly'].includes(frequency)) {
      return res.status(400).json({ message: 'Invalid frequency.' });
    }
    if (!PAYMENT_METHODS.includes(paymentMethod)) {
      return res.status(400).json({ message: 'Invalid payment method.' });
    }

    const start = startDate ? new Date(startDate) : new Date();
    const rule = await RecurringTransaction.create({
      user: req.user._id,
      type,
      amount: numAmount,
      category,
      description: description.trim(),
      paymentMethod,
      frequency,
      startDate: start,
      nextRunDate: start,
      isActive: true,
    });

    await processDueRecurringForUser(req.user._id);
    const refreshed = await RecurringTransaction.findById(rule._id);

    res.status(201).json({ recurring: refreshed });
  } catch (err) {
    next(err);
  }
});

// PUT /api/recurring/:id
router.put('/:id', async (req, res, next) => {
  try {
    const rule = await RecurringTransaction.findOne({ _id: req.params.id, user: req.user._id });
    if (!rule) {
      return res.status(404).json({ message: 'Recurring transaction not found.' });
    }

    const { type, amount, category, description, paymentMethod, frequency, isActive, nextRunDate } = req.body;
    if (type !== undefined && ['income', 'expense'].includes(type)) rule.type = type;
    if (amount !== undefined) {
      const a = Number(amount);
      if (Number.isNaN(a) || a <= 0) return res.status(400).json({ message: 'Amount must be > 0.' });
      rule.amount = a;
    }
    if (category !== undefined) rule.category = category;
    if (description !== undefined && description.trim()) rule.description = description.trim();
    if (paymentMethod !== undefined && PAYMENT_METHODS.includes(paymentMethod)) {
      rule.paymentMethod = paymentMethod;
    }
    if (frequency !== undefined && ['daily', 'weekly', 'monthly', 'yearly'].includes(frequency)) {
      rule.frequency = frequency;
    }
    if (isActive !== undefined) rule.isActive = Boolean(isActive);
    if (nextRunDate !== undefined) rule.nextRunDate = new Date(nextRunDate);

    await rule.save();
    res.json({ recurring: rule });
  } catch (err) {
    next(err);
  }
});

// POST /api/recurring/process
router.post('/process', async (req, res, next) => {
  try {
    const processedCount = await processDueRecurringForUser(req.user._id);
    const items = await RecurringTransaction.find({ user: req.user._id }).sort({ nextRunDate: 1 });
    res.json({ processedCount, recurring: items });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/recurring/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await RecurringTransaction.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!deleted) {
      return res.status(404).json({ message: 'Recurring transaction not found.' });
    }
    res.json({ message: 'Recurring rule deleted.' });
  } catch (err) {
    next(err);
  }
});

export default router;
