import express from 'express';
import Transaction from '../models/Transaction.js';
import { protect } from '../middleware/auth.js';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS } from '../constants/categories.js';
import { evaluateBudgetAlertsForMonth } from '../utils/budgetAlerts.js';
import { processDueRecurringForUser } from '../utils/recurringProcessor.js';

const router = express.Router();

router.use(protect);

function validateTransactionInput({ type, amount, category, description, date, paymentMethod }) {
  if (!['income', 'expense'].includes(type)) {
    return 'Transaction type must be income or expense.';
  }
  const numAmount = Number(amount);
  if (Number.isNaN(numAmount) || numAmount <= 0) {
    return 'Amount must be a positive number greater than 0.';
  }
  const allowedCats = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  if (!category || !allowedCats.includes(category)) {
    return `Invalid category for ${type}.`;
  }
  if (!description || !description.trim()) {
    return 'Description is required.';
  }
  if (date && Number.isNaN(new Date(date).getTime())) {
    return 'Invalid transaction date.';
  }
  if (paymentMethod && !PAYMENT_METHODS.includes(paymentMethod)) {
    return 'Invalid payment method.';
  }
  return null;
}

// GET /api/transactions
router.get('/', async (req, res, next) => {
  try {
    await processDueRecurringForUser(req.user._id);

    const {
      type,
      category,
      paymentMethod,
      search,
      startDate,
      endDate,
      sort = 'date_desc',
      page = 1,
      limit = 50,
    } = req.query;

    const filter = { user: req.user._id };

    if (type && ['income', 'expense'].includes(type)) {
      filter.type = type;
    }
    if (category && category !== 'all') {
      filter.category = category;
    }
    if (paymentMethod && paymentMethod !== 'all') {
      filter.paymentMethod = paymentMethod;
    }
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        filter.date.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }
    if (search && search.trim()) {
      const regex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { description: regex },
        { category: regex },
        { paymentMethod: regex },
        { notes: regex },
      ];
    }

    const sortMap = {
      date_desc: { date: -1, createdAt: -1 },
      date_asc: { date: 1, createdAt: 1 },
      amount_desc: { amount: -1, date: -1 },
      amount_asc: { amount: 1, date: -1 },
    };
    const sortObj = sortMap[sort] || sortMap.date_desc;

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(500, Math.max(1, Number(limit) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [transactions, totalCount, aggSummary] = await Promise.all([
      Transaction.find(filter).sort(sortObj).skip(skip).limit(limitNum),
      Transaction.countDocuments(filter),
      Transaction.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$type',
            total: { $sum: '$amount' },
          },
        },
      ]),
    ]);

    let filteredIncome = 0;
    let filteredExpense = 0;
    for (const row of aggSummary) {
      if (row._id === 'income') filteredIncome = row.total;
      if (row._id === 'expense') filteredExpense = row.total;
    }

    res.json({
      transactions,
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.max(1, Math.ceil(totalCount / limitNum)),
      },
      summary: {
        filteredIncome,
        filteredExpense,
        filteredNet: filteredIncome - filteredExpense,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/transactions
router.post('/', async (req, res, next) => {
  try {
    const errorMsg = validateTransactionInput(req.body);
    if (errorMsg) {
      return res.status(400).json({ message: errorMsg });
    }

    const { type, amount, category, description, date, paymentMethod = 'UPI', notes = '' } = req.body;
    const txDate = date ? new Date(date) : new Date();

    const transaction = await Transaction.create({
      user: req.user._id,
      type,
      amount: Number(amount),
      category,
      description: description.trim(),
      date: txDate,
      paymentMethod,
      notes: String(notes || '').trim(),
    });

    if (type === 'expense') {
      await evaluateBudgetAlertsForMonth(req.user._id, txDate.getMonth() + 1, txDate.getFullYear());
    }

    res.status(201).json({ transaction });
  } catch (err) {
    next(err);
  }
});

// PUT /api/transactions/:id
router.put('/:id', async (req, res, next) => {
  try {
    const existing = await Transaction.findOne({ _id: req.params.id, user: req.user._id });
    if (!existing) {
      return res.status(404).json({ message: 'Transaction not found.' });
    }

    const merged = {
      type: req.body.type ?? existing.type,
      amount: req.body.amount ?? existing.amount,
      category: req.body.category ?? existing.category,
      description: req.body.description ?? existing.description,
      date: req.body.date ?? existing.date,
      paymentMethod: req.body.paymentMethod ?? existing.paymentMethod,
    };

    const errorMsg = validateTransactionInput(merged);
    if (errorMsg) {
      return res.status(400).json({ message: errorMsg });
    }

    existing.type = merged.type;
    existing.amount = Number(merged.amount);
    existing.category = merged.category;
    existing.description = merged.description.trim();
    existing.date = new Date(merged.date);
    existing.paymentMethod = merged.paymentMethod;
    if (req.body.notes !== undefined) {
      existing.notes = String(req.body.notes).trim();
    }

    await existing.save();

    if (existing.type === 'expense') {
      await evaluateBudgetAlertsForMonth(
        req.user._id,
        existing.date.getMonth() + 1,
        existing.date.getFullYear()
      );
    }

    res.json({ transaction: existing });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/transactions/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await Transaction.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!deleted) {
      return res.status(404).json({ message: 'Transaction not found.' });
    }
    res.json({ message: 'Transaction deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

export default router;
