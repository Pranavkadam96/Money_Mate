import React, { useEffect, useState, useCallback } from 'react';
import { Repeat, Plus, Play, Pause, Trash2, RefreshCw, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS } from '../constants/finance';
import { formatCurrency, formatDate, formatDateInput } from '../utils/format';
import Modal from '../components/UI/Modal';
import ConfirmDialog from '../components/UI/ConfirmDialog';
import EmptyState from '../components/UI/EmptyState';

export default function RecurringPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const currency = user?.currency || 'INR';

  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    type: 'expense',
    amount: '',
    category: EXPENSE_CATEGORIES[0],
    description: '',
    paymentMethod: PAYMENT_METHODS[0],
    frequency: 'monthly',
    startDate: formatDateInput(new Date()),
  });
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.recurring.list();
      setRules(res.recurring || []);
    } catch (err) {
      showToast(err.message || 'Failed to load recurring transactions.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const categories = form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const handleTypeChange = (nextType) => {
    const nextCats = nextType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    setForm((prev) => ({
      ...prev,
      type: nextType,
      category: nextCats[0],
    }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const amount = Number(form.amount);
    if (Number.isNaN(amount) || amount <= 0) {
      showToast('Enter a valid amount greater than 0.', 'error');
      return;
    }
    if (!form.description.trim()) {
      showToast('Description is required.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await api.recurring.create({
        ...form,
        amount,
        description: form.description.trim(),
      });
      showToast('Recurring rule created!', 'success');
      setModalOpen(false);
      setForm({
        type: 'expense',
        amount: '',
        category: EXPENSE_CATEGORIES[0],
        description: '',
        paymentMethod: PAYMENT_METHODS[0],
        frequency: 'monthly',
        startDate: formatDateInput(new Date()),
      });
      window.dispatchEvent(new Event('moneymate:data-updated'));
      fetchRules();
    } catch (err) {
      showToast(err.message || 'Failed to create recurring rule.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (rule) => {
    try {
      await api.recurring.update(rule._id, { isActive: !rule.isActive });
      showToast(`Rule ${rule.isActive ? 'paused' : 'activated'}.`, 'info');
      fetchRules();
    } catch (err) {
      showToast(err.message || 'Failed to update rule.', 'error');
    }
  };

  const handleProcessDue = async () => {
    setProcessing(true);
    try {
      const res = await api.recurring.process();
      setRules(res.recurring || []);
      if (res.processedCount > 0) {
        showToast(`Recorded ${res.processedCount} due recurring transaction(s).`, 'success');
        window.dispatchEvent(new Event('moneymate:data-updated'));
      } else {
        showToast('All recurring schedules are up to date.', 'info');
      }
    } catch (err) {
      showToast(err.message || 'Failed to process recurring rules.', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      await api.recurring.remove(deleteTarget._id);
      showToast('Recurring rule removed.', 'success');
      setDeleteTarget(null);
      fetchRules();
    } catch (err) {
      showToast(err.message || 'Failed to delete rule.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
            Recurring Transactions
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Automate repeating salaries, rent, subscriptions, and utility bills.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleProcessDue}
            disabled={processing}
            className="btn-secondary text-xs py-2 px-3.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${processing ? 'animate-spin' : ''}`} />
            Run Due Now
          </button>
          <button onClick={() => setModalOpen(true)} className="btn-primary text-xs py-2 px-4">
            <Plus className="h-4 w-4" />
            New Recurring Rule
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3 animate-pulse">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-slate-100 dark:bg-navy-800/60" />
            ))}
          </div>
        ) : rules.length === 0 ? (
          <EmptyState
            icon={Repeat}
            title="No recurring rules set up"
            description="Schedule recurring monthly income or bills so MoneyMate logs them automatically on their due dates."
            action={
              <button onClick={() => setModalOpen(true)} className="btn-primary text-xs">
                <Plus className="h-4 w-4" /> Add Recurring Rule
              </button>
            }
          />
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-navy-800">
            {rules.map((rule) => (
              <div
                key={rule._id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 hover:bg-slate-50/70 dark:hover:bg-navy-800/40 transition-colors"
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      rule.type === 'income'
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400'
                        : 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400'
                    }`}
                  >
                    {rule.type === 'income' ? (
                      <ArrowDownLeft className="h-5 w-5" />
                    ) : (
                      <ArrowUpRight className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {rule.description}
                      </p>
                      <span className="rounded-full bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400">
                        {rule.frequency}
                      </span>
                      {!rule.isActive && (
                        <span className="rounded-full bg-slate-100 dark:bg-navy-800 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500">
                          Paused
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {rule.category} • {rule.paymentMethod} • Next Run: {formatDate(rule.nextRunDate)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4">
                  <span
                    className={`text-sm font-extrabold ${
                      rule.type === 'income'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {rule.type === 'income' ? '+' : '-'}
                    {formatCurrency(rule.amount, currency)}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleToggleActive(rule)}
                      className="rounded-lg border border-slate-200 dark:border-navy-700 p-2 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400"
                      title={rule.isActive ? 'Pause rule' : 'Resume rule'}
                      aria-label={rule.isActive ? 'Pause rule' : 'Resume rule'}
                    >
                      {rule.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => setDeleteTarget(rule)}
                      className="rounded-lg border border-slate-200 dark:border-navy-700 p-2 text-slate-500 hover:text-rose-600"
                      aria-label="Delete recurring rule"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="New Recurring Transaction"
        subtitle="Automatically log repeating income or expenses on schedule."
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-2.5 p-1 rounded-xl bg-slate-100 dark:bg-navy-950 border border-slate-200 dark:border-navy-800">
            <button
              type="button"
              onClick={() => handleTypeChange('expense')}
              className={`rounded-lg py-2 text-sm font-semibold transition-all ${
                form.type === 'expense'
                  ? 'bg-rose-600 text-white'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              Recurring Expense
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('income')}
              className={`rounded-lg py-2 text-sm font-semibold transition-all ${
                form.type === 'income'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              Recurring Income
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label-text" htmlFor="rec-amount">
                Amount ({currency})
              </label>
              <input
                id="rec-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="label-text" htmlFor="rec-freq">
                Frequency
              </label>
              <select
                id="rec-freq"
                value={form.frequency}
                onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                className="input-field"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label-text" htmlFor="rec-cat">
                Category
              </label>
              <select
                id="rec-cat"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="input-field"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-text" htmlFor="rec-pm">
                Payment Method
              </label>
              <select
                id="rec-pm"
                value={form.paymentMethod}
                onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                className="input-field"
              >
                {PAYMENT_METHODS.map((pm) => (
                  <option key={pm} value={pm}>
                    {pm}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label-text" htmlFor="rec-desc">
                Description
              </label>
              <input
                id="rec-desc"
                type="text"
                placeholder="e.g., Apartment Rent, Netflix, Salary"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="label-text" htmlFor="rec-start">
                Start Date
              </label>
              <input
                id="rec-start"
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Schedule'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={submitting}
        title="Delete Recurring Rule"
        message={`Stop and remove "${deleteTarget?.description}"? Existing logged transactions will remain in your history.`}
      />
    </div>
  );
}
