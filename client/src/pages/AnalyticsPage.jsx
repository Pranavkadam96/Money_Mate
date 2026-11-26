import React, { useEffect, useState, useCallback } from 'react';
import {
  FileText,
  FileSpreadsheet,
  BarChart3,
  TrendingUp,
  PieChart as PieIcon,
  Calendar,
  RotateCcw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, CATEGORY_COLORS } from '../constants/finance';
import { formatCurrency, formatCompactCurrency } from '../utils/format';
import { exportReportToExcel, exportReportToPDF } from '../utils/exportReports';
import StatCard from '../components/UI/StatCard';
import EmptyState from '../components/UI/EmptyState';

const ALL_CATEGORIES = [...new Set([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES])];

export default function AnalyticsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const currency = user?.currency || 'INR';

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [category, setCategory] = useState('all');
  const [timeframe, setTimeframe] = useState('monthly'); // daily | weekly | monthly | yearly
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.analytics.reports({ startDate, endDate, category });
      setReport(res);
    } catch (err) {
      showToast(err.message || 'Failed to load analytics.', 'error');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, category, showToast]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  useEffect(() => {
    const onUpdated = () => fetchReport();
    window.addEventListener('moneymate:data-updated', onUpdated);
    return () => window.removeEventListener('moneymate:data-updated', onUpdated);
  }, [fetchReport]);

  const dateRangeLabel =
    startDate || endDate
      ? `${startDate || 'Start'} to ${endDate || 'Present'}`
      : 'All Time';

  const handleDownloadPDF = () => {
    if (!report) return;
    exportReportToPDF({
      user,
      totals: report.totals,
      categorySpending: report.categorySpending,
      transactions: report.transactions,
      dateRangeLabel,
    });
    showToast('PDF financial report downloaded.', 'success');
  };

  const handleDownloadExcel = () => {
    if (!report) return;
    exportReportToExcel({
      user,
      totals: report.totals,
      categorySpending: report.categorySpending,
      transactions: report.transactions,
      dateRangeLabel,
    });
    showToast('Excel financial report downloaded.', 'success');
  };

  const timeframeDataMap = {
    daily: report?.dailyAnalysis || [],
    weekly: report?.weeklyAnalysis || [],
    monthly: report?.monthlyAnalysis || [],
    yearly: report?.yearlyAnalysis || [],
  };

  const activeTimeSeries = timeframeDataMap[timeframe] || [];

  const ChartTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900 p-3 shadow-card-lg text-xs">
        <p className="font-bold text-slate-900 dark:text-white mb-1">{label}</p>
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

  const totals = report?.totals || {
    totalIncome: 0,
    totalExpenses: 0,
    netSavings: 0,
    savingsRate: 0,
    transactionCount: 0,
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header & Exports */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
            Analytics & Financial Reports
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Analyze daily, weekly, monthly, and yearly trends and export professional reports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleDownloadPDF}
            disabled={loading || !report}
            className="btn-secondary text-xs py-2 px-3.5"
          >
            <FileText className="h-4 w-4 text-rose-600" />
            Export PDF
          </button>
          <button
            onClick={handleDownloadExcel}
            disabled={loading || !report}
            className="btn-primary text-xs py-2 px-3.5"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Export Excel
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 sm:p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <div>
            <label className="label-text" htmlFor="rep-start">
              Start Date
            </label>
            <div className="relative">
              <input
                id="rep-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="label-text" htmlFor="rep-end">
              End Date
            </label>
            <input
              id="rep-end"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input-field"
            />
          </div>

          <div>
            <label className="label-text" htmlFor="rep-cat">
              Category
            </label>
            <select
              id="rep-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input-field"
            >
              <option value="all">All Categories</option>
              {ALL_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              setStartDate('');
              setEndDate('');
              setCategory('all');
            }}
            className="btn-secondary justify-center"
          >
            <RotateCcw className="h-4 w-4" />
            Reset Filters
          </button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Period Income"
          value={formatCurrency(totals.totalIncome, currency)}
          subtitle={`${totals.transactionCount} total transactions`}
          icon={TrendingUp}
          accent="emerald"
        />
        <StatCard
          title="Period Expenses"
          value={formatCurrency(totals.totalExpenses, currency)}
          subtitle={dateRangeLabel}
          icon={BarChart3}
          accent="rose"
        />
        <StatCard
          title="Net Savings"
          value={formatCurrency(totals.netSavings, currency)}
          subtitle="Income minus expenses"
          icon={Calendar}
          accent="blue"
        />
        <StatCard
          title="Savings Rate"
          value={`${totals.savingsRate}%`}
          subtitle="Share of income retained"
          icon={PieIcon}
          accent="indigo"
        />
      </div>

      {!loading && totals.transactionCount === 0 ? (
        <div className="card">
          <EmptyState
            icon={BarChart3}
            title="No analytics data for this selection"
            description="Add income or expense transactions (or clear your date/category filters) to view interactive charts."
          />
        </div>
      ) : (
        <>
          {/* Timeframe Expense Analysis (Daily / Weekly / Monthly / Yearly) */}
          <div className="card p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {timeframe.charAt(0).toUpperCase() + timeframe.slice(1)} Expense Analysis
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Switch horizons to inspect daily, weekly, monthly, or yearly spending patterns
                </p>
              </div>
              <div className="inline-flex rounded-xl bg-slate-100 dark:bg-navy-950 p-1 border border-slate-200 dark:border-navy-800">
                {['daily', 'weekly', 'monthly', 'yearly'].map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-all ${
                      timeframe === tf
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activeTimeSeries}>
                  <defs>
                    <linearGradient id="analyticExpenseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => formatCompactCurrency(v, currency)}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="expense"
                    name="Expenses"
                    stroke="#2563EB"
                    strokeWidth={2.5}
                    fill="url(#analyticExpenseGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="income"
                    name="Income"
                    stroke="#10B981"
                    strokeWidth={2}
                    fillOpacity={0}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Income vs Expense Comparison + Savings Trends */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-6">
              <div className="mb-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Income vs Expense Comparison
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Monthly inflow vs outflow balance
                </p>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={report?.incomeVsExpense || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => formatCompactCurrency(v, currency)}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend />
                    <Bar dataKey="income" name="Income" fill="#10B981" radius={[6, 6, 0, 0]} maxBarSize={28} />
                    <Bar dataKey="expense" name="Expense" fill="#EF4444" radius={[6, 6, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card p-6">
              <div className="mb-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Savings Trends
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Monthly net savings & cumulative trajectory
                </p>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={report?.savingsTrends || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => formatCompactCurrency(v, currency)}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="monthlySavings"
                      name="Monthly Savings"
                      stroke="#3B82F6"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="cumulativeSavings"
                      name="Cumulative Net"
                      stroke="#10B981"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Category-wise Spending */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-6">
              <div className="mb-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Category-wise Spending Distribution
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Share of total expenses per category
                </p>
              </div>
              {report?.categorySpending?.length ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={report.categorySpending}
                        dataKey="amount"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        innerRadius={58}
                        outerRadius={92}
                        paddingAngle={3}
                      >
                        {report.categorySpending.map((entry) => (
                          <Cell
                            key={entry.category}
                            fill={CATEGORY_COLORS[entry.category] || '#64748B'}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyState icon={PieIcon} title="No expenses recorded" description="Add expenses to visualize category share." />
              )}
            </div>

            <div className="card p-6">
              <div className="mb-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Top Expense Categories
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Ranked by total spend in selected period
                </p>
              </div>
              {report?.categorySpending?.length ? (
                <div className="space-y-3.5">
                  {report.categorySpending.map((item) => (
                    <div key={item.category} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-800 dark:text-slate-200">{item.category}</span>
                        <span className="text-slate-900 dark:text-white">
                          {formatCurrency(item.amount, currency)} ({item.percentage}%)
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-navy-800 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(100, item.percentage)}%`,
                            backgroundColor: CATEGORY_COLORS[item.category] || '#2563EB',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={BarChart3} title="No category expenses" description="Expenses will appear here once added." />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
