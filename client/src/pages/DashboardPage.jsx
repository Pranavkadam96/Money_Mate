import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Target,
  Plus,
  Sparkles,
  ArrowRight,
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
  AlertTriangle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatCurrency, formatCompactCurrency, formatDate } from '../utils/format';
import { CATEGORY_COLORS, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../constants/finance';
import StatCard from '../components/UI/StatCard';
import EmptyState from '../components/UI/EmptyState';
import { DashboardSkeleton } from '../components/UI/LoadingSkeleton';
import TransactionModal from '../components/Transactions/TransactionModal';

const ALL_CATEGORIES = [...new Set([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES])];

export default function DashboardPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const currency = user?.currency || 'INR';

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [category, setCategory] = useState('all');

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalState, setModalState] = useState({ open: false, type: 'expense', tx: null });

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await api.analytics.dashboard({ month, year, category });
      setData(res);
    } catch (err) {
      showToast(err.message || 'Failed to load dashboard data.', 'error');
    } finally {
      setLoading(false);
    }
  }, [month, year, category, showToast]);

  useEffect(() => {
    setLoading(true);
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    const onUpdated = () => fetchDashboard();
    window.addEventListener('moneymate:data-updated', onUpdated);
    return () => window.removeEventListener('moneymate:data-updated', onUpdated);
  }, [fetchDashboard]);

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(2026, i, 1).toLocaleString('en-US', { month: 'long' }),
  }));
  const years = [now.getFullYear() - 2, now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  if (loading && !data) {
    return <DashboardSkeleton />;
  }

  const stats = data?.stats || {};
  const recentTransactions = data?.recentTransactions || [];
  const incomeVsExpense = data?.incomeVsExpense || [];
  const monthlySpendingOverview = data?.monthlySpendingOverview || [];
  const categoryBreakdown = data?.categoryBreakdown || [];
  const smartInsights = data?.smartInsights || [];
  const goals = data?.goals || [];

  const budgetPct = Math.min(100, stats.monthlyBudgetPct || 0);
  const budgetBarColor =
    stats.monthlyBudgetPct >= 100
      ? 'bg-rose-500'
      : stats.monthlyBudgetPct >= 80
      ? 'bg-amber-500'
      : 'bg-blue-600';

  const ChartTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900 p-3 shadow-card-lg text-xs">
        <p className="font-bold text-slate-900 dark:text-white mb-1.5">{label}</p>
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center justify-between gap-4 py-0.5">
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.name}
            </span>
            <span className="font-bold text-slate-900 dark:text-white">
              {formatCurrency(entry.value, currency)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
            Welcome back, {user?.name?.split(' ')[0]}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Here is your financial overview and real-time spending breakdown.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900 px-3 py-2">
            <Calendar className="h-4 w-4 text-slate-400" />
            <select
              aria-label="Filter month"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              {months.map((m) => (
                <option key={m.value} value={m.value} className="dark:bg-navy-900">
                  {m.label}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter year"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              {years.map((y) => (
                <option key={y} value={y} className="dark:bg-navy-900">
                  {y}
                </option>
              ))}
            </select>
          </div>

          <select
            aria-label="Filter category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none"
          >
            <option value="all">All Categories</option>
            {ALL_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <button
            onClick={() => setModalState({ open: true, type: 'income', tx: null })}
            className="btn-secondary py-2 px-3 text-xs"
          >
            <Plus className="h-3.5 w-3.5 text-emerald-600" />
            Income
          </button>
          <button
            onClick={() => setModalState({ open: true, type: 'expense', tx: null })}
            className="btn-primary py-2 px-3 text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            Expense
          </button>
        </div>
      </div>

      {/* Budget Alert Banner if >= 80% */}
      {stats.monthlyBudgetLimit > 0 && stats.monthlyBudgetPct >= 80 && (
        <div
          className={`flex items-center justify-between gap-4 rounded-2xl border p-4 ${
            stats.monthlyBudgetPct >= 100
              ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200'
              : 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <p className="text-xs sm:text-sm font-semibold">
              {stats.monthlyBudgetPct >= 100
                ? `Monthly budget exceeded! You spent ${formatCurrency(stats.monthExpenses, currency)} of ${formatCurrency(stats.monthlyBudgetLimit, currency)} (${stats.monthlyBudgetPct}%).`
                : `You have used ${stats.monthlyBudgetPct}% of your monthly budget (${formatCurrency(stats.monthExpenses, currency)} / ${formatCurrency(stats.monthlyBudgetLimit, currency)}).`}
            </p>
          </div>
          <Link to="/budgets" className="text-xs font-bold underline shrink-0">
            Manage Budget
          </Link>
        </div>
      )}

      {/* 5 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <StatCard
          title="Total Balance"
          value={formatCurrency(stats.totalBalance || 0, currency)}
          subtitle="All-time net cash flow"
          icon={Wallet}
          accent="navy"
          trend={{
            label: 'Savings Rate',
            value: `${stats.savingsRate || 0}%`,
            color: (stats.savingsRate || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500',
          }}
        />
        <StatCard
          title="Total Income"
          value={formatCurrency(stats.totalIncome || 0, currency)}
          subtitle={`This month: ${formatCurrency(stats.monthIncome || 0, currency)}`}
          icon={TrendingUp}
          accent="emerald"
        />
        <StatCard
          title="Total Expenses"
          value={formatCurrency(stats.totalExpenses || 0, currency)}
          subtitle={`This month: ${formatCurrency(stats.monthExpenses || 0, currency)}`}
          icon={TrendingDown}
          accent="rose"
        />
        <StatCard
          title="Total Savings"
          value={formatCurrency(stats.totalSavings || 0, currency)}
          subtitle={`Across ${goals.length} active goal${goals.length === 1 ? '' : 's'}`}
          icon={Target}
          accent="indigo"
        />

        {/* Monthly Budget Card */}
        <div className="card-hover p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Monthly Budget
              </p>
              <p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white truncate">
                {stats.monthlyBudgetLimit > 0
                  ? formatCurrency(stats.monthlyBudgetLimit, currency)
                  : 'Not Set'}
              </p>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <PiggyBank className="h-5 w-5" />
            </div>
          </div>

          {stats.monthlyBudgetLimit > 0 ? (
            <div className="mt-3">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-500 dark:text-slate-400">
                  {stats.monthlyBudgetPct}% used
                </span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {formatCurrency(Math.max(0, stats.monthlyBudgetRemaining), currency)} left
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-navy-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${budgetBarColor}`}
                  style={{ width: `${budgetPct}%` }}
                />
              </div>
            </div>
          ) : (
            <Link
              to="/budgets"
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Set monthly limit <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Income vs Expense Bar Chart */}
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Income vs Expense
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                6-month cash flow comparison
              </p>
            </div>
            <Link
              to="/analytics"
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              Full Analytics <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={incomeVsExpense} barGap={6}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => formatCompactCurrency(v, currency)}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="income" name="Income" fill="#10B981" radius={[6, 6, 0, 0]} maxBarSize={32} />
                <Bar dataKey="expense" name="Expense" fill="#2563EB" radius={[6, 6, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Category Breakdown */}
        <div className="card p-6 flex flex-col">
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Expense Category Breakdown
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {months.find((m) => m.value === month)?.label} {year}
            </p>
          </div>

          {categoryBreakdown.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <EmptyState
                icon={PiggyBank}
                title="No expenses yet"
                description="Add an expense transaction for this month to see category breakdown."
              />
            </div>
          ) : (
            <>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryBreakdown}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={80}
                      paddingAngle={3}
                    >
                      {categoryBreakdown.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={CATEGORY_COLORS[entry.name] || '#64748B'}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 space-y-2 max-h-40 overflow-y-auto pr-1">
                {categoryBreakdown.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: CATEGORY_COLORS[item.name] || '#64748B' }}
                      />
                      {item.name}
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {formatCurrency(item.value, currency)}{' '}
                      <span className="text-slate-400 font-normal">({item.percentage}%)</span>
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Monthly Spending Overview + Smart Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-6">
          <div className="mb-5">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Monthly Spending Overview
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Daily expense trend for {months.find((m) => m.value === month)?.label} {year}
            </p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlySpendingOverview}>
                <defs>
                  <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => formatCompactCurrency(v, currency)}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="spending"
                  name="Spending"
                  stroke="#2563EB"
                  strokeWidth={2.5}
                  fill="url(#spendGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Smart Spending Insights */}
        <div className="card p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Smart Insights
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Personalized cash flow analysis
              </p>
            </div>
          </div>

          <div className="space-y-3 flex-1">
            {smartInsights.map((insight) => {
              const toneBorder =
                insight.tone === 'positive'
                  ? 'border-l-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20'
                  : insight.tone === 'warning'
                  ? 'border-l-amber-500 bg-amber-50/40 dark:bg-amber-950/20'
                  : insight.tone === 'danger'
                  ? 'border-l-rose-500 bg-rose-50/40 dark:bg-rose-950/20'
                  : 'border-l-blue-500 bg-blue-50/40 dark:bg-blue-950/20';

              return (
                <div
                  key={insight.id}
                  className={`rounded-xl border border-slate-100 dark:border-navy-800 border-l-4 p-3.5 ${toneBorder}`}
                >
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{insight.title}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    {insight.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Transactions & Savings Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-navy-800">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Recent Transactions
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Latest recorded entries</p>
            </div>
            <Link
              to="/transactions"
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              View All <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {recentTransactions.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="No transactions recorded"
              description="Record your first income or expense to populate your MoneyMate dashboard."
              action={
                <button
                  onClick={() => setModalState({ open: true, type: 'expense', tx: null })}
                  className="btn-primary text-xs"
                >
                  <Plus className="h-4 w-4" /> Add First Transaction
                </button>
              }
            />
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-navy-800">
              {recentTransactions.map((tx) => (
                <div
                  key={tx._id}
                  onClick={() => setModalState({ open: true, type: tx.type, tx })}
                  className="flex items-center justify-between gap-4 px-6 py-3.5 hover:bg-slate-50/80 dark:hover:bg-navy-800/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                        tx.type === 'income'
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400'
                          : 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400'
                      }`}
                    >
                      {tx.type === 'income' ? (
                        <ArrowDownLeft className="h-5 w-5" />
                      ) : (
                        <ArrowUpRight className="h-5 w-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {tx.description}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {tx.category} • {tx.paymentMethod} • {formatDate(tx.date)}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-sm font-bold shrink-0 ${
                      tx.type === 'income'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {tx.type === 'income' ? '+' : '-'}
                    {formatCurrency(tx.amount, currency)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Savings Goals Snapshot */}
        <div className="card p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Savings Goals</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Progress toward targets</p>
            </div>
            <Link
              to="/goals"
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Manage
            </Link>
          </div>

          {goals.length === 0 ? (
            <EmptyState
              icon={Target}
              title="No savings goals"
              description="Create a target to track your emergency fund, vacation, or purchase."
              action={
                <Link to="/goals" className="btn-secondary text-xs">
                  Create Goal
                </Link>
              }
            />
          ) : (
            <div className="space-y-4">
              {goals.map((goal) => (
                <div
                  key={goal._id}
                  className="rounded-xl border border-slate-100 dark:border-navy-800 p-3.5"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
                    <span className="truncate">{goal.name}</span>
                    <span>{goal.progressPercent}%</span>
                  </div>
                  <div className="mt-2 h-2 w-full rounded-full bg-slate-100 dark:bg-navy-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${goal.progressPercent}%`,
                        backgroundColor: goal.color || '#2563EB',
                      }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>Saved: {formatCurrency(goal.savedAmount, currency)}</span>
                    <span>Goal: {formatCurrency(goal.targetAmount, currency)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <TransactionModal
        isOpen={modalState.open}
        onClose={() => setModalState({ open: false, type: 'expense', tx: null })}
        defaultType={modalState.type}
        initialData={modalState.tx}
        onSuccess={fetchDashboard}
      />
    </div>
  );
}
