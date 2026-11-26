import express from 'express';
import Budget from '../models/Budget.js';
import Transaction from '../models/Transaction.js';
import { protect } from '../middleware/auth.js';
import { EXPENSE_CATEGORIES } from '../constants/categories.js';
import { evaluateBudgetAlertsForMonth } from '../utils/budgetAlerts.js';

const router = express.Router();
router.use(protect);

async function buildBudgetSummary(userId, month, year) {
  const budget = await Budget.findOne({ user: userId, month, year });

  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59, 999);

  const spentRows = await Transaction.aggregate([
    {
      $match: {
        user: userId,
        type: 'expense',
        date: { $gte: start, $lte: end },
      },
    },
    {
      $group: {
        _id: '$category',
        spent: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
  ]);

  const spentMap = {};
  let totalSpent = 0;
  for (const row of spentRows) {
    spentMap[row._id] = { spent: row.spent, count: row.count };
    totalSpent += row.spent;
  }

  const limitMap = {};
  for (const item of budget?.categoryLimits || []) {
    limitMap[item.category] = item.limit;
  }

  const categories = EXPENSE_CATEGORIES.map((category) => {
    const limit = limitMap[category] || 0;
    const spent = spentMap[category]?.spent || 0;
    const count = spentMap[category]?.count || 0;
    const percentage = limit > 0 ? Math.round((spent / limit) * 1000) / 10 : 0;
    let status = 'healthy';
    if (limit > 0 && percentage >= 100) status = 'exceeded';
    else if (limit > 0 && percentage >= 80) status = 'warning';

    return {
      category,
      limit,
      spent,
      remaining: limit > 0 ? limit - spent : 0,
      percentage,
      status,
      transactionCount: count,
    };
  });

  const totalLimit = budget?.totalLimit || 0;
  const overallPercentage = totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 1000) / 10 : 0;
  let overallStatus = 'healthy';
  if (totalLimit > 0 && overallPercentage >= 100) overallStatus = 'exceeded';
  else if (totalLimit > 0 && overallPercentage >= 80) overallStatus = 'warning';

  const alerts = [];
  if (totalLimit > 0 && overallPercentage >= 100) {
    alerts.push({
      level: 'exceeded',
      scope: 'Overall Monthly Budget',
      message: `Monthly spending has exceeded your ${totalLimit} budget (${overallPercentage}% used).`,
    });
  } else if (totalLimit > 0 && overallPercentage >= 80) {
    alerts.push({
      level: 'warning',
      scope: 'Overall Monthly Budget',
      message: `Monthly spending has reached ${overallPercentage}% of your overall budget.`,
    });
  }

  for (const cat of categories) {
    if (cat.status === 'exceeded') {
      alerts.push({
        level: 'exceeded',
        scope: cat.category,
        message: `${cat.category} spending exceeded its category limit (${cat.percentage}% used).`,
      });
    } else if (cat.status === 'warning') {
      alerts.push({
        level: 'warning',
        scope: cat.category,
        message: `${cat.category} is approaching its spending limit (${cat.percentage}% used).`,
      });
    }
  }

  return {
    id: budget?._id || null,
    month,
    year,
    totalLimit,
    totalSpent,
    remaining: totalLimit > 0 ? totalLimit - totalSpent : 0,
    percentage: overallPercentage,
    status: overallStatus,
    categories,
    alerts,
  };
}

// GET /api/budgets?month=&year=
router.get('/', async (req, res, next) => {
  try {
    const now = new Date();
    const month = Math.min(12, Math.max(1, Number(req.query.month) || now.getMonth() + 1));
    const year = Math.min(2100, Math.max(2000, Number(req.query.year) || now.getFullYear()));

    const summary = await buildBudgetSummary(req.user._id, month, year);
    res.json({ budget: summary });
  } catch (err) {
    next(err);
  }
});

// PUT /api/budgets
router.put('/', async (req, res, next) => {
  try {
    const now = new Date();
    const month = Number(req.body.month) || now.getMonth() + 1;
    const year = Number(req.body.year) || now.getFullYear();
    const totalLimit = Number(req.body.totalLimit ?? 0);

    if (month < 1 || month > 12 || year < 2000 || year > 2100) {
      return res.status(400).json({ message: 'Invalid month or year.' });
    }
    if (Number.isNaN(totalLimit) || totalLimit < 0) {
      return res.status(400).json({ message: 'Monthly budget limit cannot be negative.' });
    }

    const rawLimits = Array.isArray(req.body.categoryLimits) ? req.body.categoryLimits : [];
    const cleanedLimits = [];
    for (const item of rawLimits) {
      if (!EXPENSE_CATEGORIES.includes(item.category)) continue;
      const val = Number(item.limit);
      if (Number.isNaN(val) || val < 0) {
        return res.status(400).json({ message: `Invalid limit for ${item.category}.` });
      }
      if (val > 0) {
        cleanedLimits.push({ category: item.category, limit: val });
      }
    }

    await Budget.findOneAndUpdate(
      { user: req.user._id, month, year },
      { totalLimit, categoryLimits: cleanedLimits },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await evaluateBudgetAlertsForMonth(req.user._id, month, year);
    const summary = await buildBudgetSummary(req.user._id, month, year);
    res.json({ budget: summary });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/budgets/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await Budget.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!deleted) {
      return res.status(404).json({ message: 'Budget not found.' });
    }
    res.json({ message: 'Budget deleted.' });
  } catch (err) {
    next(err);
  }
});

export default router;
