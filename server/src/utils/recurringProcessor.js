import RecurringTransaction from '../models/RecurringTransaction.js';
import Transaction from '../models/Transaction.js';
import Notification from '../models/Notification.js';
import { evaluateBudgetAlertsForMonth } from './budgetAlerts.js';

export function advanceDateByFrequency(date, frequency) {
  const next = new Date(date);
  switch (frequency) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'yearly':
      next.setFullYear(next.getFullYear() + 1);
      break;
    default:
      next.setMonth(next.getMonth() + 1);
  }
  return next;
}

export async function processDueRecurringForUser(userId) {
  const now = new Date();
  const dueRules = await RecurringTransaction.find({
    user: userId,
    isActive: true,
    nextRunDate: { $lte: now },
  });

  if (!dueRules.length) return 0;

  let createdCount = 0;
  const affectedMonths = new Set();

  for (const rule of dueRules) {
    let runDate = new Date(rule.nextRunDate);
    let iterations = 0;
    const maxCatchUp = 12;

    while (runDate <= now && iterations < maxCatchUp) {
      await Transaction.create({
        user: userId,
        type: rule.type,
        amount: rule.amount,
        category: rule.category,
        description: `${rule.description} (Recurring)`,
        date: new Date(runDate),
        paymentMethod: rule.paymentMethod,
        isRecurringInstance: true,
        recurringRule: rule._id,
      });

      affectedMonths.add(`${runDate.getFullYear()}-${runDate.getMonth() + 1}`);
      rule.lastRunDate = new Date(runDate);
      runDate = advanceDateByFrequency(runDate, rule.frequency);
      createdCount += 1;
      iterations += 1;
    }

    rule.nextRunDate = runDate;
    await rule.save();
  }

  if (createdCount > 0) {
    await Notification.create({
      user: userId,
      title: 'Recurring Transactions Processed',
      message: `${createdCount} scheduled recurring transaction${createdCount > 1 ? 's were' : ' was'} automatically recorded.`,
      type: 'recurring',
    });

    for (const key of affectedMonths) {
      const [y, m] = key.split('-').map(Number);
      await evaluateBudgetAlertsForMonth(userId, m, y);
    }
  }

  return createdCount;
}
