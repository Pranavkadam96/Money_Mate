import React, { useEffect, useState, useCallback } from 'react';
import { Target, Plus, Edit3, Trash2, Coins, CheckCircle2, Calendar } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { GOAL_COLORS } from '../constants/finance';
import { formatCurrency, formatDate, formatDateInput } from '../utils/format';
import Modal from '../components/UI/Modal';
import ConfirmDialog from '../components/UI/ConfirmDialog';
import EmptyState from '../components/UI/EmptyState';

const GOAL_CATEGORIES = ['Emergency Fund', 'Travel', 'Gadgets', 'Education', 'Home', 'Investment', 'Vehicle', 'Other'];

export default function GoalsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const currency = user?.currency || 'INR';

  const [goals, setGoals] = useState([]);
  const [summary, setSummary] = useState({ totalTarget: 0, totalSaved: 0, totalRemaining: 0, overallProgress: 0 });
  const [loading, setLoading] = useState(true);

  const [goalModal, setGoalModal] = useState({ open: false, editing: null });
  const [form, setForm] = useState({
    name: '',
    targetAmount: '',
    savedAmount: '',
    targetDate: '',
    category: 'Emergency Fund',
    color: GOAL_COLORS[0],
  });
  const [submitting, setSubmitting] = useState(false);

  const [contribModal, setContribModal] = useState({ open: false, goal: null });
  const [contribForm, setContribForm] = useState({ amount: '', note: '' });
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchGoals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.goals.list();
      setGoals(res.goals || []);
      setSummary(res.summary || { totalTarget: 0, totalSaved: 0, totalRemaining: 0, overallProgress: 0 });
    } catch (err) {
      showToast(err.message || 'Failed to load savings goals.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const openCreateModal = () => {
    setForm({
      name: '',
      targetAmount: '',
      savedAmount: '0',
      targetDate: '',
      category: 'Emergency Fund',
      color: GOAL_COLORS[0],
    });
    setGoalModal({ open: true, editing: null });
  };

  const openEditModal = (goal) => {
    setForm({
      name: goal.name,
      targetAmount: String(goal.targetAmount),
      savedAmount: String(goal.savedAmount),
      targetDate: goal.targetDate ? formatDateInput(goal.targetDate) : '',
      category: goal.category || 'Other',
      color: goal.color || GOAL_COLORS[0],
    });
    setGoalModal({ open: true, editing: goal });
  };

  const handleSaveGoal = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      showToast('Goal name is required.', 'error');
      return;
    }
    const target = Number(form.targetAmount);
    const saved = Number(form.savedAmount || 0);
    if (Number.isNaN(target) || target <= 0) {
      showToast('Target amount must be greater than 0.', 'error');
      return;
    }
    if (Number.isNaN(saved) || saved < 0) {
      showToast('Saved amount cannot be negative.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        targetAmount: target,
        savedAmount: saved,
        targetDate: form.targetDate || null,
        category: form.category,
        color: form.color,
      };

      if (goalModal.editing) {
        await api.goals.update(goalModal.editing._id, payload);
        showToast('Savings goal updated.', 'success');
      } else {
        await api.goals.create(payload);
        showToast('Savings goal created!', 'success');
      }
      setGoalModal({ open: false, editing: null });
      window.dispatchEvent(new Event('moneymate:data-updated'));
      fetchGoals();
    } catch (err) {
      showToast(err.message || 'Failed to save goal.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleContribute = async (e) => {
    e.preventDefault();
    const amount = Number(contribForm.amount);
    if (Number.isNaN(amount) || amount === 0) {
      showToast('Enter a valid non-zero contribution amount.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await api.goals.contribute(contribModal.goal._id, {
        amount,
        note: contribForm.note.trim(),
      });
      showToast('Contribution recorded!', 'success');
      setContribModal({ open: false, goal: null });
      setContribForm({ amount: '', note: '' });
      window.dispatchEvent(new Event('moneymate:data-updated'));
      fetchGoals();
    } catch (err) {
      showToast(err.message || 'Failed to update goal contribution.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      await api.goals.remove(deleteTarget._id);
      showToast('Savings goal deleted.', 'success');
      setDeleteTarget(null);
      window.dispatchEvent(new Event('moneymate:data-updated'));
      fetchGoals();
    } catch (err) {
      showToast(err.message || 'Failed to delete goal.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
            Savings Goals
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Set targets, track deposits, and monitor how close you are to your milestones.
          </p>
        </div>
        <button onClick={openCreateModal} className="btn-primary text-xs py-2.5 px-4 self-start">
          <Plus className="h-4 w-4" />
          New Savings Goal
        </button>
      </div>

      {/* Summary Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Total Saved
          </p>
          <p className="mt-1.5 text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(summary.totalSaved, currency)}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Total Target
          </p>
          <p className="mt-1.5 text-2xl font-extrabold text-slate-900 dark:text-white">
            {formatCurrency(summary.totalTarget, currency)}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Remaining to Save
          </p>
          <p className="mt-1.5 text-2xl font-extrabold text-blue-600 dark:text-blue-400">
            {formatCurrency(summary.totalRemaining, currency)}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Overall Progress
          </p>
          <p className="mt-1.5 text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
            {summary.overallProgress}%
          </p>
        </div>
      </div>

      {/* Goals Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card p-6 h-52 animate-pulse" />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Target}
            title="No savings goals yet"
            description="Create your first goal — whether it is an emergency fund, new laptop, or dream trip."
            action={
              <button onClick={openCreateModal} className="btn-primary text-xs">
                <Plus className="h-4 w-4" /> Create Your First Goal
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {goals.map((goal) => (
            <div key={goal._id} className="card-hover p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"
                      style={{ backgroundColor: goal.color || '#2563EB' }}
                    >
                      {goal.isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <Target className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                        {goal.name}
                      </h3>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {goal.category}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(goal)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-navy-800"
                      aria-label="Edit goal"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(goal)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-navy-800"
                      aria-label="Delete goal"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="flex items-baseline justify-between text-xs mb-2">
                    <span className="font-bold text-slate-900 dark:text-white text-lg">
                      {formatCurrency(goal.savedAmount, currency)}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                      of {formatCurrency(goal.targetAmount, currency)}
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-navy-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${goal.progressPercent}%`,
                        backgroundColor: goal.color || '#2563EB',
                      }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-200">
                      {goal.progressPercent}% achieved
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                      {goal.isCompleted
                        ? 'Target reached!'
                        : `${formatCurrency(goal.remainingAmount, currency)} left`}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-navy-800 flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                  <Calendar className="h-3.5 w-3.5" />
                  {goal.targetDate ? `Due ${formatDate(goal.targetDate)}` : 'No deadline'}
                </span>
                <button
                  onClick={() => {
                    setContribForm({ amount: '', note: '' });
                    setContribModal({ open: true, goal });
                  }}
                  className="btn-secondary py-1.5 px-3 text-xs"
                >
                  <Coins className="h-3.5 w-3.5 text-blue-600" />
                  Add Funds
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Goal Modal */}
      <Modal
        isOpen={goalModal.open}
        onClose={() => setGoalModal({ open: false, editing: null })}
        title={goalModal.editing ? 'Edit Savings Goal' : 'Create Savings Goal'}
      >
        <form onSubmit={handleSaveGoal} className="space-y-4">
          <div>
            <label className="label-text" htmlFor="goal-name">
              Goal Name
            </label>
            <input
              id="goal-name"
              type="text"
              placeholder="e.g., Emergency Fund, MacBook Pro, Goa Trip"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label-text" htmlFor="goal-target">
                Target Amount ({currency})
              </label>
              <input
                id="goal-target"
                type="number"
                min="1"
                step="0.01"
                value={form.targetAmount}
                onChange={(e) => setForm({ ...form, targetAmount: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="label-text" htmlFor="goal-saved">
                Saved Amount ({currency})
              </label>
              <input
                id="goal-saved"
                type="number"
                min="0"
                step="0.01"
                value={form.savedAmount}
                onChange={(e) => setForm({ ...form, savedAmount: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label-text" htmlFor="goal-cat">
                Category
              </label>
              <select
                id="goal-cat"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="input-field"
              >
                {GOAL_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-text" htmlFor="goal-date">
                Target Date (Optional)
              </label>
              <input
                id="goal-date"
                type="date"
                value={form.targetDate}
                onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="label-text">Accent Color</label>
            <div className="flex items-center gap-2.5">
              {GOAL_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setForm({ ...form, color })}
                  className={`h-8 w-8 rounded-full transition-transform ${
                    form.color === color ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : ''
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`Select color ${color}`}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setGoalModal({ open: false, editing: null })}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : goalModal.editing ? 'Update Goal' : 'Create Goal'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Contribution Modal */}
      <Modal
        isOpen={contribModal.open}
        onClose={() => setContribModal({ open: false, goal: null })}
        title={`Add Funds to "${contribModal.goal?.name || ''}"`}
        subtitle={`Remaining to reach target: ${formatCurrency(contribModal.goal?.remainingAmount || 0, currency)}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleContribute} className="space-y-4">
          <div>
            <label className="label-text" htmlFor="contrib-amount">
              Amount ({currency})
            </label>
            <input
              id="contrib-amount"
              type="number"
              step="0.01"
              placeholder="e.g., 5000 (or negative to withdraw)"
              value={contribForm.amount}
              onChange={(e) => setContribForm({ ...contribForm, amount: e.target.value })}
              className="input-field"
            />
          </div>
          <div>
            <label className="label-text" htmlFor="contrib-note">
              Note (Optional)
            </label>
            <input
              id="contrib-note"
              type="text"
              placeholder="e.g., Monthly salary allocation"
              value={contribForm.note}
              onChange={(e) => setContribForm({ ...contribForm, note: e.target.value })}
              className="input-field"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setContribModal({ open: false, goal: null })}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Updating...' : 'Save Contribution'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={submitting}
        title="Delete Savings Goal"
        message={`Are you sure you want to delete "${deleteTarget?.name}"?`}
      />
    </div>
  );
}
