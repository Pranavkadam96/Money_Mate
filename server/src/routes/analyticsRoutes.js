import express from 'express';
import Transaction from '../models/Transaction.js';
import Budget from '../models/Budget.js';
import SavingsGoal from '../models/SavingsGoal.js';
import Notification from '../models/Notification.js';
import { protect } from '../middleware/auth.js';
import { processDueRecurringForUser } from '../utils/recurringProcessor.js';
import { computeSmartInsights } from '../utils/insights.js';

const router = express.Router();
router.use(protect);

function getMonthKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

// GET /api/analytics/dashboard
router.get('/dashboard', async (req, res, next) => {
  try {
    await processDueRecurringForUser(req.user._id);

    const now = new Date();
    const month = Math.min(12, Math.max(1, Number(req.query.month) || now.getMonth() + 1));
    const year = Math.min(2100, Math.max(2000, Number(req.query.year) || now.getFullYear()));
    const categoryFilter = req.query.category && req.query.category !== 'all' ? req.query.category : null;

    const [allTransactions, currentBudget, goals, unreadNotificationsCount] = await Promise.all([
      Transaction.find({ user: req.user._id }).sort({ date: -1 }),
      Budget.findOne({ user: req.user._id, month, year }),
      SavingsGoal.find({ user: req.user._id }).sort({ createdAt: -1 }),
      Notification.countDocuments({ user: req.user._id, isRead: false }),
    ]);

    const scopedTx = categoryFilter
      ? allTransactions.filter((t) => t.category === categoryFilter)
      : allTransactions;

    let totalIncome = 0;
    let totalExpenses = 0;
    let monthIncome = 0;
    let monthExpenses = 0;

    for (const tx of scopedTx) {
      if (tx.type === 'income') totalIncome += tx.amount;
      else totalExpenses += tx.amount;

      const d = new Date(tx.date);
      if (d.getMonth() + 1 === month && d.getFullYear() === year) {
        if (tx.type === 'income') monthIncome += tx.amount;
        else monthExpenses += tx.amount;
      }
    }

    const totalBalance = totalIncome - totalExpenses;
    const totalSavings = goals.reduce((sum, g) => sum + (g.savedAmount || 0), 0);
    const monthlyBudgetLimit = currentBudget?.totalLimit || req.user.monthlyBudgetDefault || 0;
    const monthlyBudgetPct =
      monthlyBudgetLimit > 0 ? Math.round((monthExpenses / monthlyBudgetLimit) * 1000) / 10 : 0;

    // Income vs Expense for last 6 months ending at selected month/year
    const incomeVsExpense = [];
    for (let i = 5; i >= 0; i--) {
      const ref = new Date(year, month - 1 - i, 1);
      const m = ref.getMonth();
      const y = ref.getFullYear();
      const label = ref.toLocaleString('en-US', { month: 'short', year: '2-digit' });

      let income = 0;
      let expense = 0;
      for (const tx of scopedTx) {
        const td = new Date(tx.date);
        if (td.getMonth() === m && td.getFullYear() === y) {
          if (tx.type === 'income') income += tx.amount;
          else expense += tx.amount;
        }
      }
      incomeVsExpense.push({
        month: label,
        income,
        expense,
        savings: income - expense,
      });
    }

    // Monthly spending overview (day-by-day for selected month)
    const daysInMonth = new Date(year, month, 0).getDate();
    const dailyMap = new Map();
    for (let d = 1; d <= daysInMonth; d++) {
      dailyMap.set(d, { day: String(d), spending: 0, income: 0 });
    }
    for (const tx of scopedTx) {
      const td = new Date(tx.date);
      if (td.getMonth() + 1 === month && td.getFullYear() === year) {
        const entry = dailyMap.get(td.getDate());
        if (entry) {
          if (tx.type === 'expense') entry.spending += tx.amount;
          else entry.income += tx.amount;
        }
      }
    }
    const monthlySpendingOverview = Array.from(dailyMap.values());

    // Expense category breakdown for selected month
    const catTotals = {};
    for (const tx of scopedTx) {
      const td = new Date(tx.date);
      if (tx.type === 'expense' && td.getMonth() + 1 === month && td.getFullYear() === year) {
        catTotals[tx.category] = (catTotals[tx.category] || 0) + tx.amount;
      }
    }
    const categoryBreakdown = Object.entries(catTotals)
      .map(([name, value]) => ({
        name,
        value,
        percentage: monthExpenses > 0 ? Math.round((value / monthExpenses) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.value - a.value);

    const smartInsights = computeSmartInsights({
      transactions: allTransactions,
      currentMonthBudget: currentBudget,
      goals,
      currency: req.user.currency || 'INR',
    });

    res.json({
      stats: {
        totalBalance,
        totalIncome,
        totalExpenses,
        totalSavings,
        monthIncome,
        monthExpenses,
        monthlyBudgetLimit,
        monthlyBudgetRemaining: monthlyBudgetLimit > 0 ? monthlyBudgetLimit - monthExpenses : 0,
        monthlyBudgetPct,
        savingsRate:
          totalIncome > 0 ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 1000) / 10 : 0,
      },
      recentTransactions: scopedTx.slice(0, 7),
      incomeVsExpense,
      monthlySpendingOverview,
      categoryBreakdown,
      smartInsights,
      goals: goals.slice(0, 4).map((g) => ({
        _id: g._id,
        name: g.name,
        targetAmount: g.targetAmount,
        savedAmount: g.savedAmount,
        color: g.color,
        progressPercent: Math.min(100, Math.round((g.savedAmount / g.targetAmount) * 1000) / 10),
        remainingAmount: Math.max(0, g.targetAmount - g.savedAmount),
      })),
      unreadNotificationsCount,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/reports
router.get('/reports', async (req, res, next) => {
  try {
    const { startDate, endDate, category } = req.query;
    const filter = { user: req.user._id };

    if (category && category !== 'all') {
      filter.category = category;
    }
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) {
        const s = new Date(startDate);
        s.setHours(0, 0, 0, 0);
        filter.date.$gte = s;
      }
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        filter.date.$lte = e;
      }
    }

    const transactions = await Transaction.find(filter).sort({ date: -1 });

    let totalIncome = 0;
    let totalExpenses = 0;

    const dailyBuckets = new Map();
    const weeklyBuckets = new Map();
    const monthlyBuckets = new Map();
    const yearlyBuckets = new Map();
    const categoryBuckets = new Map();

    // Sort ascending for chronological charts
    const ascTx = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));

    for (const tx of ascTx) {
      const d = new Date(tx.date);
      const isIncome = tx.type === 'income';
      if (isIncome) totalIncome += tx.amount;
      else totalExpenses += tx.amount;

      // Daily
      const dayKey = d.toISOString().slice(0, 10);
      if (!dailyBuckets.has(dayKey)) {
        dailyBuckets.set(dayKey, {
          label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          dateKey: dayKey,
          income: 0,
          expense: 0,
        });
      }
      const dBucket = dailyBuckets.get(dayKey);
      if (isIncome) dBucket.income += tx.amount;
      else dBucket.expense += tx.amount;

      // Weekly
      const weekStart = getWeekStart(d);
      const weekKey = weekStart.toISOString().slice(0, 10);
      if (!weeklyBuckets.has(weekKey)) {
        weeklyBuckets.set(weekKey, {
          label: `Wk ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
          weekKey,
          income: 0,
          expense: 0,
        });
      }
      const wBucket = weeklyBuckets.get(weekKey);
      if (isIncome) wBucket.income += tx.amount;
      else wBucket.expense += tx.amount;

      // Monthly
      const monthKey = getMonthKey(d);
      if (!monthlyBuckets.has(monthKey)) {
        monthlyBuckets.set(monthKey, {
          label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          monthKey,
          income: 0,
          expense: 0,
          savings: 0,
        });
      }
      const mBucket = monthlyBuckets.get(monthKey);
      if (isIncome) mBucket.income += tx.amount;
      else mBucket.expense += tx.amount;
      mBucket.savings = mBucket.income - mBucket.expense;

      // Yearly
      const yearKey = String(d.getFullYear());
      if (!yearlyBuckets.has(yearKey)) {
        yearlyBuckets.set(yearKey, { label: yearKey, income: 0, expense: 0, savings: 0 });
      }
      const yBucket = yearlyBuckets.get(yearKey);
      if (isIncome) yBucket.income += tx.amount;
      else yBucket.expense += tx.amount;
      yBucket.savings = yBucket.income - yBucket.expense;

      // Category-wise expenses
      if (!isIncome) {
        categoryBuckets.set(tx.category, (categoryBuckets.get(tx.category) || 0) + tx.amount);
      }
    }

    // Build cumulative savings trends from monthly buckets
    let cumulative = 0;
    const savingsTrends = Array.from(monthlyBuckets.values()).map((m) => {
      cumulative += m.savings;
      return {
        label: m.label,
        monthlySavings: m.savings,
        cumulativeSavings: cumulative,
      };
    });

    const categorySpending = Array.from(categoryBuckets.entries())
      .map(([categoryName, amount]) => ({
        category: categoryName,
        amount,
        percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const netSavings = totalIncome - totalExpenses;

    res.json({
      totals: {
        totalIncome,
        totalExpenses,
        netSavings,
        savingsRate: totalIncome > 0 ? Math.round((netSavings / totalIncome) * 1000) / 10 : 0,
        transactionCount: transactions.length,
      },
      dailyAnalysis: Array.from(dailyBuckets.values()).slice(-30),
      weeklyAnalysis: Array.from(weeklyBuckets.values()).slice(-12),
      monthlyAnalysis: Array.from(monthlyBuckets.values()).slice(-12),
      yearlyAnalysis: Array.from(yearlyBuckets.values()),
      categorySpending,
      incomeVsExpense: Array.from(monthlyBuckets.values()).slice(-12),
      savingsTrends,
      transactions,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
