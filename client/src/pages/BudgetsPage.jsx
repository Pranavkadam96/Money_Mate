import React, { useEffect, useState, useCallback } from 'react';
import { PiggyBank, AlertTriangle, CheckCircle2, Save, Calendar } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { EXPENSE_CATEGORIES, CATEGORY_COLORS } from '../constants/finance';
import { formatCurrency } from '../utils/format';

export default function BudgetsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const currency = user?.currency || 'INR';

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const [budgetData, setBudgetData] = useState(null);
  const [totalLimit, setTotalLimit] = useState('');
  const [catLimits, setCatLimits] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchBudget = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.budgets.get({ month, year });
      const b = res.budget;
      setBudgetData(b);
      setTotalLimit(b.totalLimit ? String(b.totalLimit) : '');
      const map = {};
      for (const cat of b.categories || []) {
        map[cat.category] = cat.limit ? String(cat.limit) : '';
      }
      setCatLimits(map);
    } catch (err) {
      showToast(err.message || 'Failed to load budget.', 'error');
    } finally {
      setLoading(false);
    }
  }, [month, year, showToast]);

  useEffect(() => {
    fetchBudget();
  }, [fetchBudget]);

  useEffect(() => {
    const onUpdated = () => fetchBudget();
    window.addEventListener('moneymate:data-updated', onUpdated);
    return () => window.removeEventListener('moneymate:data-updated', onUpdated);
  }, [fetchBudget]);

  const handleSave = async (e) => {
    e.preventDefault();
    const numericTotal = Number(totalLimit || 0);
    if (Number.isNaN(numericTotal) || numericTotal < 0) {
      showToast('Monthly budget limit must be 0 or greater.', 'error');
      return;
    }

    const categoryLimits = EXPENSE_CATEGORIES.map((category) => ({
      category,
      limit: Number(catLimits[category] || 0),
    })).filter((c) => c.limit > 0);

    for (const item of categoryLimits) {
      if (Number.isNaN(item.limit) || item.limit < 0) {
        showToast(`Invalid limit for ${item.category}.`, 'error');
        return;
      }
    }

    setSaving(true);
    try {
      const res = await api.budgets.save({
        month,
        year,
        totalLimit: numericTotal,
        categoryLimits,
      });
      setBudgetData(res.budget);
      showToast('Monthly budget and category limits saved!', 'success');
      window.dispatchEvent(new Event('moneymate:data-updated'));
    } catch (err) {
      showToast(err.message || 'Failed to save budget.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(2026, i, 1).toLocaleString('en-US', { month: 'long' }),
  }));
  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  const getBarColor = (status) => {
    if (status === 'exceeded') return 'bg-rose-500';
    if (status === 'warning') return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const getStatusBadge = (limit, status) => {
    if (!limit) {
      return (
        <span className="rounded-full bg-slate-100 dark:bg-navy-800 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          No Limit
        </span>
      );
    }
    if (status === 'exceeded') {
      return (
        <span className="rounded-full bg-rose-100 dark:bg-rose-950/60 px-2.5 py-0.5 text-[11px] font-bold text-rose-600 dark:text-rose-400">
          Exceeded
        </span>
      );
    }
    if (status === 'warning') {
      return (
        <span className="rounded-full bg-amber-100 dark:bg-amber-950/60 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-300">
          Approaching Limit
        </span>
      );
    }
    return (
      <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
        On Track
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
            Budget Management
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Configure monthly spending ceilings and monitor category utilization in real time.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900 px-3 py-2 self-start">
          <Calendar className="h-4 w-4 text-slate-400" />
          <select
            aria-label="Budget Month"
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
            aria-label="Budget Year"
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
      </div>

      {/* Budget Alerts */}
      {budgetData?.alerts?.length > 0 && (
        <div className="space-y-2.5">
          {budgetData.alerts.map((alert, idx) => (
            <div
              key={`${alert.scope}-${idx}`}
              className={`flex items-center gap-3 rounded-2xl border p-4 ${
                alert.level === 'exceeded'
                  ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200'
                  : 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200'
              }`}
            >
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <div className="text-xs sm:text-sm">
                <span className="font-bold">{alert.scope}: </span>
                <span>{alert.message}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Overall Summary Card */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <PiggyBank className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Overall Monthly Budget — {months.find((m) => m.value === month)?.label} {year}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Spent {formatCurrency(budgetData?.totalSpent || 0, currency)} of{' '}
                {budgetData?.totalLimit > 0
                  ? formatCurrency(budgetData.totalLimit, currency)
                  : 'unlimited'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {getStatusBadge(budgetData?.totalLimit, budgetData?.status)}
            {budgetData?.totalLimit > 0 && (
              <span className="text-lg font-extrabold text-slate-900 dark:text-white">
                {budgetData.percentage}%
              </span>
            )}
          </div>
        </div>

        {budgetData?.totalLimit > 0 && (
          <div className="mt-5">
            <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-navy-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getBarColor(budgetData.status)}`}
                style={{ width: `${Math.min(100, budgetData.percentage)}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Spent: {formatCurrency(budgetData.totalSpent, currency)}</span>
              <span>
                {budgetData.remaining >= 0
                  ? `Remaining: ${formatCurrency(budgetData.remaining, currency)}`
                  : `Over by: ${formatCurrency(Math.abs(budgetData.remaining), currency)}`}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Configuration Form & Category Utilization */}
      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-6 space-y-5 h-fit">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Set Budget Limits
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Leave any category blank or 0 to track without a limit.
            </p>
          </div>

          <div>
            <label className="label-text" htmlFor="overall-budget-limit">
              Total Monthly Budget ({currency})
            </label>
            <input
              id="overall-budget-limit"
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g., 50000"
              value={totalLimit}
              onChange={(e) => setTotalLimit(e.target.value)}
              className="input-field"
            />
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-navy-800">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Category Limits
            </p>
            {EXPENSE_CATEGORIES.map((category) => (
              <div key={category} className="flex items-center justify-between gap-3">
                <label
                  htmlFor={`cat-limit-${category}`}
                  className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2 min-w-[120px]"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: CATEGORY_COLORS[category] || '#64748B' }}
                  />
                  {category}
                </label>
                <input
                  id={`cat-limit-${category}`}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  value={catLimits[category] ?? ''}
                  onChange={(e) =>
                    setCatLimits((prev) => ({ ...prev, [category]: e.target.value }))
                  }
                  className="input-field py-1.5 text-right max-w-[140px]"
                />
              </div>
            ))}
          </div>

          <button type="submit" className="btn-primary w-full" disabled={saving || loading}>
            <Save className="h-4 w-4" />
            {saving ? 'Saving Budget...' : 'Save Monthly Budget'}
          </button>
        </div>

        {/* Category Progress Cards */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 h-fit">
          {(budgetData?.categories || []).map((cat) => (
            <div key={cat.category} className="card p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: CATEGORY_COLORS[cat.category] || '#64748B' }}
                    />
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {cat.category}
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {cat.transactionCount} expense{cat.transactionCount === 1 ? '' : 's'} this month
                  </p>
                </div>
                {getStatusBadge(cat.limit, cat.status)}
              </div>

              <div className="flex items-baseline justify-between">
                <span className="text-lg font-extrabold text-slate-900 dark:text-white">
                  {formatCurrency(cat.spent, currency)}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {cat.limit > 0 ? `of ${formatCurrency(cat.limit, currency)}` : 'No limit set'}
                </span>
              </div>

              {cat.limit > 0 ? (
                <>
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-navy-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${getBarColor(cat.status)}`}
                      style={{ width: `${Math.min(100, cat.percentage)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>{cat.percentage}% utilized</span>
                    <span>
                      {cat.remaining >= 0
                        ? `${formatCurrency(cat.remaining, currency)} left`
                        : `Exceeded by ${formatCurrency(Math.abs(cat.remaining), currency)}`}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Set a limit on the left to enable threshold alerts.</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </form>
    </div>
  );
}
