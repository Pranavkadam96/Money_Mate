import React, { useEffect, useState } from 'react';
import Modal from '../UI/Modal';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS } from '../../constants/finance';
import { formatDateInput } from '../../utils/format';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';

export default function TransactionModal({
  isOpen,
  onClose,
  initialData = null,
  defaultType = 'expense',
  onSuccess,
}) {
  const { showToast } = useToast();
  const isEditing = Boolean(initialData?._id);

  const [form, setForm] = useState({
    type: defaultType,
    amount: '',
    category: defaultType === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0],
    description: '',
    date: formatDateInput(new Date()),
    paymentMethod: PAYMENT_METHODS[0],
    notes: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setErrors({});
    if (initialData) {
      setForm({
        type: initialData.type || 'expense',
        amount: String(initialData.amount ?? ''),
        category:
          initialData.category ||
          (initialData.type === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]),
        description: initialData.description || '',
        date: formatDateInput(initialData.date || new Date()),
        paymentMethod: initialData.paymentMethod || PAYMENT_METHODS[0],
        notes: initialData.notes || '',
      });
    } else {
      setForm({
        type: defaultType,
        amount: '',
        category: defaultType === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0],
        description: '',
        date: formatDateInput(new Date()),
        paymentMethod: PAYMENT_METHODS[0],
        notes: '',
      });
    }
  }, [isOpen, initialData, defaultType]);

  const categories = form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const handleTypeChange = (nextType) => {
    const nextCats = nextType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    setForm((prev) => ({
      ...prev,
      type: nextType,
      category: nextCats.includes(prev.category) ? prev.category : nextCats[0],
    }));
  };

  const validate = () => {
    const nextErrors = {};
    const num = Number(form.amount);
    if (!form.amount || Number.isNaN(num) || num <= 0) {
      nextErrors.amount = 'Enter a valid amount greater than 0.';
    }
    if (!form.description.trim()) {
      nextErrors.description = 'Description is required.';
    }
    if (!form.category) {
      nextErrors.category = 'Select a category.';
    }
    if (!form.date) {
      nextErrors.date = 'Select a date.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        amount: Number(form.amount),
        description: form.description.trim(),
        notes: form.notes.trim(),
      };

      if (isEditing) {
        await api.transactions.update(initialData._id, payload);
        showToast('Transaction updated successfully.', 'success');
      } else {
        await api.transactions.create(payload);
        showToast(
          `${form.type === 'income' ? 'Income' : 'Expense'} added successfully.`,
          'success'
        );
      }
      window.dispatchEvent(new Event('moneymate:data-updated'));
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      showToast(err.message || 'Failed to save transaction.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Transaction' : 'New Transaction'}
      subtitle={
        isEditing
          ? 'Update transaction details below.'
          : 'Record a new income or expense entry.'
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type Switcher */}
        <div>
          <label className="label-text">Transaction Type</label>
          <div className="grid grid-cols-2 gap-2.5 p-1 rounded-xl bg-slate-100 dark:bg-navy-950 border border-slate-200 dark:border-navy-800">
            <button
              type="button"
              onClick={() => handleTypeChange('expense')}
              className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${
                form.type === 'expense'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-navy-800'
              }`}
            >
              <ArrowUpRight className="h-4 w-4" />
              Expense
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('income')}
              className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${
                form.type === 'income'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-navy-800'
              }`}
            >
              <ArrowDownLeft className="h-4 w-4" />
              Income
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label-text" htmlFor="tx-amount">
              Amount
            </label>
            <input
              id="tx-amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="input-field"
            />
            {errors.amount && <p className="text-xs text-rose-500 mt-1">{errors.amount}</p>}
          </div>

          <div>
            <label className="label-text" htmlFor="tx-date">
              Date
            </label>
            <input
              id="tx-date"
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="input-field"
            />
            {errors.date && <p className="text-xs text-rose-500 mt-1">{errors.date}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label-text" htmlFor="tx-category">
              Category
            </label>
            <select
              id="tx-category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="input-field"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            {errors.category && <p className="text-xs text-rose-500 mt-1">{errors.category}</p>}
          </div>

          <div>
            <label className="label-text" htmlFor="tx-payment">
              Payment Method
            </label>
            <select
              id="tx-payment"
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

        <div>
          <label className="label-text" htmlFor="tx-description">
            Description
          </label>
          <input
            id="tx-description"
            type="text"
            placeholder={
              form.type === 'income'
                ? 'e.g., Monthly Salary, Freelance Invoice'
                : 'e.g., Grocery shopping, Metro pass, Electricity bill'
            }
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="input-field"
          />
          {errors.description && (
            <p className="text-xs text-rose-500 mt-1">{errors.description}</p>
          )}
        </div>

        <div>
          <label className="label-text" htmlFor="tx-notes">
            Notes (Optional)
          </label>
          <textarea
            id="tx-notes"
            rows={2}
            placeholder="Any extra context or receipt details..."
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="input-field resize-none"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary" disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Saving...' : isEditing ? 'Update Transaction' : 'Save Transaction'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
