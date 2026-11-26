import Budget from '../models/Budget.js';
import Transaction from '../models/Transaction.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { formatAmount } from './formatCurrency.js';

async function upsertBudgetNotification({ userId, metaKey, title, message, type }) {
  const existing = await Notification.findOne({ user: userId, metaKey });
  if (existing) {
    if (existing.message !== message || existing.title !== title || existing.type !== type) {
      existing.title = title;
      existing.message = message;
      existing.type = type;
      existing.isRead = false;
      await existing.save();
    }
    return;
  }
  await Notification.create({
    user: userId,
    title,
    message,
    type,
    metaKey,
  });
}

export async function evaluateBudgetAlertsForMonth(userId, month, year) {
  const user = await User.findById(userId).select('currency notificationsEnabled');
  if (!user || !user.notificationsEnabled) return;

  const budget = await Budget.findOne({ user: userId, month, year });
  if (!budget) return;

  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59, 999);

  const expenses = await Transaction.aggregate([
    {
      $match: {
        user: user._id,
        type: 'expense',
        date: { $gte: start, $lte: end },
      },
    },
    {
      $group: {
        _id: '$category',
        spent: { $sum: '$amount' },
      },
    },
  ]);

  const spentByCategory = {};
  let totalSpent = 0;
  for (const row of expenses) {
    spentByCategory[row._id] = row.spent;
    totalSpent += row.spent;
  }

  const monthLabel = start.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const currency = user.currency || 'INR';

  if (budget.totalLimit > 0) {
    const pct = (totalSpent / budget.totalLimit) * 100;
    if (pct >= 100) {
      await upsertBudgetNotification({
        userId,
        metaKey: `budget-${year}-${month}-overall-100`,
        title: `Monthly Budget Exceeded (${monthLabel})`,
        message: `You have spent ${formatAmount(totalSpent, currency)} against your ${formatAmount(budget.totalLimit, currency)} monthly limit (${pct.toFixed(0)}%).`,
        type: 'budget_exceeded',
      });
    } else if (pct >= 80) {
      await upsertBudgetNotification({
        userId,
        metaKey: `budget-${year}-${month}-overall-80`,
        title: `Approaching Monthly Budget (${monthLabel})`,
        message: `You have used ${pct.toFixed(0)}% (${formatAmount(totalSpent, currency)}) of your ${formatAmount(budget.totalLimit, currency)} monthly budget.`,
        type: 'budget_warning',
      });
    }
  }

  for (const catLimit of budget.categoryLimits || []) {
    if (!catLimit.limit || catLimit.limit <= 0) continue;
    const catSpent = spentByCategory[catLimit.category] || 0;
    const pct = (catSpent / catLimit.limit) * 100;

    if (pct >= 100) {
      await upsertBudgetNotification({
        userId,
        metaKey: `budget-${year}-${month}-cat-${catLimit.category}-100`,
        title: `${catLimit.category} Budget Exceeded`,
        message: `${catLimit.category} spending reached ${formatAmount(catSpent, currency)} out of ${formatAmount(catLimit.limit, currency)} (${pct.toFixed(0)}%).`,
        type: 'budget_exceeded',
      });
    } else if (pct >= 80) {
      await upsertBudgetNotification({
        userId,
        metaKey: `budget-${year}-${month}-cat-${catLimit.category}-80`,
        title: `${catLimit.category} Budget Alert`,
        message: `You've used ${pct.toFixed(0)}% of your ${catLimit.category} budget (${formatAmount(catSpent, currency)} / ${formatAmount(catLimit.limit, currency)}).`,
        type: 'budget_warning',
      });
    }
  }
}
