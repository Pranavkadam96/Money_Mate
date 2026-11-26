import { formatAmount } from './formatCurrency.js';

export function computeSmartInsights({
  transactions = [],
  currentMonthBudget = null,
  goals = [],
  currency = 'INR',
}) {
  const insights = [];
  const now = new Date();
  const curMonth = now.getMonth();
  const curYear = now.getFullYear();

  const prevDate = new Date(curYear, curMonth - 1, 1);
  const prevMonth = prevDate.getMonth();
  const prevYear = prevDate.getFullYear();

  const curMonthTx = transactions.filter((t) => {
    const d = new Date(t.date);
    return d.getMonth() === curMonth && d.getFullYear() === curYear;
  });

  const prevMonthTx = transactions.filter((t) => {
    const d = new Date(t.date);
    return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
  });

  const curIncome = curMonthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const curExpense = curMonthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const prevExpense = prevMonthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  if (transactions.length === 0) {
    insights.push({
      id: 'welcome-start',
      tone: 'info',
      title: 'Start Tracking Your Cash Flow',
      description: 'Add your first income or expense transaction to unlock personalized spending patterns and monthly savings insights.',
    });
    return insights;
  }

  // 1. Month-over-month expense comparison
  if (prevExpense > 0 && curExpense > 0) {
    const diffPct = ((curExpense - prevExpense) / prevExpense) * 100;
    if (diffPct > 10) {
      insights.push({
        id: 'mom-up',
        tone: 'warning',
        title: `Spending Up ${diffPct.toFixed(0)}% vs Last Month`,
        description: `You've spent ${formatAmount(curExpense, currency)} this month compared to ${formatAmount(prevExpense, currency)} last month. Review discretionary categories to stay on track.`,
      });
    } else if (diffPct < -5) {
      insights.push({
        id: 'mom-down',
        tone: 'positive',
        title: `Great Control: Spending Down ${Math.abs(diffPct).toFixed(0)}%`,
        description: `Your expenses this month (${formatAmount(curExpense, currency)}) are lower than last month (${formatAmount(prevExpense, currency)}).`,
      });
    }
  }

  // 2. Top spending category this month
  const curExpensesList = curMonthTx.filter((t) => t.type === 'expense');
  if (curExpensesList.length > 0 && curExpense > 0) {
    const catTotals = {};
    for (const tx of curExpensesList) {
      catTotals[tx.category] = (catTotals[tx.category] || 0) + tx.amount;
    }
    const sorted = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
    const [topCat, topAmount] = sorted[0];
    const share = (topAmount / curExpense) * 100;
    insights.push({
      id: 'top-category',
      tone: share > 45 ? 'warning' : 'info',
      title: `${topCat} Is Your Top Expense (${share.toFixed(0)}%)`,
      description: `${formatAmount(topAmount, currency)} of your monthly expenses went toward ${topCat}.`,
    });
  }

  // 3. Savings rate insight
  if (curIncome > 0) {
    const net = curIncome - curExpense;
    const rate = (net / curIncome) * 100;
    if (rate >= 20) {
      insights.push({
        id: 'savings-healthy',
        tone: 'positive',
        title: `Strong Savings Rate: ${rate.toFixed(0)}%`,
        description: `You are retaining ${formatAmount(net, currency)} of your monthly income. Consider allocating a portion toward your savings goals.`,
      });
    } else if (rate >= 0) {
      insights.push({
        id: 'savings-moderate',
        tone: 'info',
        title: `Savings Rate at ${rate.toFixed(0)}%`,
        description: `Aiming for a 20% savings cushion (${formatAmount(curIncome * 0.2, currency)}) can accelerate your financial goals.`,
      });
    } else {
      insights.push({
        id: 'savings-deficit',
        tone: 'danger',
        title: 'Monthly Expenses Exceed Income',
        description: `Your current month expenses exceed income by ${formatAmount(Math.abs(net), currency)}.`,
      });
    }
  }

  // 4. Budget pacing insight
  if (currentMonthBudget && currentMonthBudget.totalLimit > 0) {
    const daysInMonth = new Date(curYear, curMonth + 1, 0).getDate();
    const dayOfMonth = now.getDate();
    const budgetPct = (curExpense / currentMonthBudget.totalLimit) * 100;
    const monthElapsedPct = (dayOfMonth / daysInMonth) * 100;

    if (budgetPct >= 100) {
      insights.push({
        id: 'budget-over',
        tone: 'danger',
        title: 'Monthly Budget Limit Exceeded',
        description: `You have spent ${formatAmount(curExpense, currency)} against a ${formatAmount(currentMonthBudget.totalLimit, currency)} budget.`,
      });
    } else if (budgetPct > monthElapsedPct + 15) {
      insights.push({
        id: 'budget-fast-pace',
        tone: 'warning',
        title: 'Budget Pace Faster Than Month Progress',
        description: `You've used ${budgetPct.toFixed(0)}% of your monthly budget with ${daysInMonth - dayOfMonth} days remaining.`,
      });
    }
  }

  // 5. Goals near completion
  const nearGoal = goals.find((g) => g.targetAmount > 0 && g.savedAmount < g.targetAmount && g.savedAmount / g.targetAmount >= 0.75);
  if (nearGoal) {
    const remaining = Math.max(0, nearGoal.targetAmount - nearGoal.savedAmount);
    insights.push({
      id: `goal-near-${nearGoal._id}`,
      tone: 'positive',
      title: `Almost There: ${nearGoal.name}`,
      description: `Only ${formatAmount(remaining, currency)} left to reach your ${formatAmount(nearGoal.targetAmount, currency)} target!`,
    });
  }

  return insights.slice(0, 4);
}
