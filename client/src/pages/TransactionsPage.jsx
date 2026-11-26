import React, { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  Search,
  Filter,
  Edit3,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
  Download,
  Repeat,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ArrowLeftRight,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS } from '../constants/finance';
import { formatCurrency, formatDate } from '../utils/format';
import { exportReportToExcel, exportReportToPDF } from '../utils/exportReports';
import TransactionModal from '../components/Transactions/TransactionModal';
import ConfirmDialog from '../components/UI/ConfirmDialog';
import EmptyState from '../components/UI/EmptyState';
import { TableSkeleton } from '../components/UI/LoadingSkeleton';

const ALL_CATEGORIES = [...new Set([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES])];

export default function TransactionsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const currency = user?.currency || 'INR';

  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({ filteredIncome: 0, filteredExpense: 0, filteredNet: 0 });
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 15, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    search: '',
    type: 'all',
    category: 'all',
    paymentMethod: 'all',
    startDate: '',
    endDate: '',
    sort: 'date_desc',
    page: 1,
  });

  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(filters.search), 250);
    return () => clearTimeout(timer);
  }, [filters.search]);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.transactions.list({
        search: debouncedSearch,
        type: filters.type === 'all' ? '' : filters.type,
        category: filters.category,
        paymentMethod: filters.paymentMethod,
        startDate: filters.startDate,
        endDate: filters.endDate,
        sort: filters.sort,
        page: filters.page,
        limit: 15,
      });
      setTransactions(res.transactions || []);
      setSummary(res.summary || { filteredIncome: 0, filteredExpense: 0, filteredNet: 0 });
      setPagination(res.pagination || { total: 0, page: 1, limit: 15, totalPages: 1 });
    } catch (err) {
      showToast(err.message || 'Failed to load transactions.', 'error');
    } finally {
      setLoading(false);
    }
  }, [
    debouncedSearch,
    filters.type,
    filters.category,
    filters.paymentMethod,
    filters.startDate,
    filters.endDate,
    filters.sort,
    filters.page,
    showToast,
  ]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    const onUpdated = () => fetchTransactions();
    window.addEventListener('moneymate:data-updated', onUpdated);
    return () => window.removeEventListener('moneymate:data-updated', onUpdated);
  }, [fetchTransactions]);

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      type: 'all',
      category: 'all',
      paymentMethod: 'all',
      startDate: '',
      endDate: '',
      sort: 'date_desc',
      page: 1,
    });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.transactions.remove(deleteTarget._id);
      showToast('Transaction deleted.', 'success');
      setDeleteTarget(null);
      window.dispatchEvent(new Event('moneymate:data-updated'));
      fetchTransactions();
    } catch (err) {
      showToast(err.message || 'Failed to delete transaction.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = async (format) => {
    try {
      const res = await api.transactions.list({
        search: debouncedSearch,
        type: filters.type === 'all' ? '' : filters.type,
        category: filters.category,
        paymentMethod: filters.paymentMethod,
        startDate: filters.startDate,
        endDate: filters.endDate,
        sort: filters.sort,
        page: 1,
        limit: 500,
      });
      const allMatching = res.transactions || [];
      const payload = {
        user,
        totals: {
          totalIncome: res.summary?.filteredIncome || 0,
          totalExpenses: res.summary?.filteredExpense || 0,
          netSavings: res.summary?.filteredNet || 0,
          savingsRate:
            res.summary?.filteredIncome > 0
              ? Math.round((res.summary.filteredNet / res.summary.filteredIncome) * 1000) / 10
              : 0,
          transactionCount: allMatching.length,
        },
        transactions: allMatching,
        dateRangeLabel:
          filters.startDate || filters.endDate
            ? `${filters.startDate || 'Start'} to ${filters.endDate || 'Present'}`
            : 'Filtered Ledger',
      };
      if (format === 'pdf') exportReportToPDF(payload);
      else exportReportToExcel(payload);
      showToast(`Exported ${allMatching.length} transactions to ${format.toUpperCase()}.`, 'success');
    } catch (err) {
      showToast(err.message || 'Export failed.', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
            Transaction History
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Search, filter, edit, and export your complete financial ledger.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button onClick={() => handleExport('pdf')} className="btn-secondary text-xs py-2 px-3">
            <Download className="h-3.5 w-3.5" />
            PDF
          </button>
          <button onClick={() => handleExport('excel')} className="btn-secondary text-xs py-2 px-3">
            <Download className="h-3.5 w-3.5" />
            Excel
          </button>
          <button
            onClick={() => {
              setEditingTx(null);
              setModalOpen(true);
            }}
            className="btn-primary text-xs py-2 px-4"
          >
            <Plus className="h-4 w-4" />
            Add Transaction
          </button>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Filtered Income
            </p>
            <p className="mt-1 text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(summary.filteredIncome, currency)}
            </p>
          </div>
          <ArrowDownLeft className="h-6 w-6 text-emerald-500" />
        </div>
        <div className="card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Filtered Expenses
            </p>
            <p className="mt-1 text-xl font-extrabold text-rose-600 dark:text-rose-400">
              {formatCurrency(summary.filteredExpense, currency)}
            </p>
          </div>
          <ArrowUpRight className="h-6 w-6 text-rose-500" />
        </div>
        <div className="card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Net Cash Flow
            </p>
            <p
              className={`mt-1 text-xl font-extrabold ${
                summary.filteredNet >= 0
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatCurrency(summary.filteredNet, currency)}
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {pagination.total} records
          </span>
        </div>
      </div>

      {/* Filters Card */}
      <div className="card p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Filter className="h-3.5 w-3.5" /> Search & Filters
          </span>
          <button
            onClick={resetFilters}
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="lg:col-span-2 relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search description, category, notes..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="input-field pl-10"
            />
          </div>

          <select
            aria-label="Filter by type"
            value={filters.type}
            onChange={(e) => updateFilter('type', e.target.value)}
            className="input-field"
          >
            <option value="all">All Types</option>
            <option value="income">Income Only</option>
            <option value="expense">Expense Only</option>
          </select>

          <select
            aria-label="Filter by category"
            value={filters.category}
            onChange={(e) => updateFilter('category', e.target.value)}
            className="input-field"
          >
            <option value="all">All Categories</option>
            {ALL_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by payment method"
            value={filters.paymentMethod}
            onChange={(e) => updateFilter('paymentMethod', e.target.value)}
            className="input-field"
          >
            <option value="all">All Payment Methods</option>
            {PAYMENT_METHODS.map((pm) => (
              <option key={pm} value={pm}>
                {pm}
              </option>
            ))}
          </select>

          <select
            aria-label="Sort order"
            value={filters.sort}
            onChange={(e) => updateFilter('sort', e.target.value)}
            className="input-field"
          >
            <option value="date_desc">Newest First</option>
            <option value="date_asc">Oldest First</option>
            <option value="amount_desc">Highest Amount</option>
            <option value="amount_asc">Lowest Amount</option>
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="label-text" htmlFor="filter-start">
              From Date
            </label>
            <input
              id="filter-start"
              type="date"
              value={filters.startDate}
              onChange={(e) => updateFilter('startDate', e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="label-text" htmlFor="filter-end">
              To Date
            </label>
            <input
              id="filter-end"
              type="date"
              value={filters.endDate}
              onChange={(e) => updateFilter('endDate', e.target.value)}
              className="input-field"
            />
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <TableSkeleton rows={6} />
        ) : transactions.length === 0 ? (
          <EmptyState
            icon={ArrowLeftRight}
            title="No matching transactions"
            description="Try adjusting your search filters or add a new income or expense entry."
            action={
              <button
                onClick={() => {
                  setEditingTx(null);
                  setModalOpen(true);
                }}
                className="btn-primary text-xs"
              >
                <Plus className="h-4 w-4" /> Add Transaction
              </button>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-navy-800 bg-slate-50/70 dark:bg-navy-950/50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="py-3.5 px-5">Description</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Payment Method</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4 text-right">Amount</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-navy-800 text-sm">
                  {transactions.map((tx) => (
                    <tr
                      key={tx._id}
                      className="hover:bg-slate-50/70 dark:hover:bg-navy-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                              tx.type === 'income'
                                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400'
                                : 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400'
                            }`}
                          >
                            {tx.type === 'income' ? (
                              <ArrowDownLeft className="h-4 w-4" />
                            ) : (
                              <ArrowUpRight className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-semibold text-slate-900 dark:text-white">
                                {tx.description}
                              </p>
                              {tx.isRecurringInstance && (
                                <Repeat
                                  className="h-3.5 w-3.5 text-blue-500"
                                  title="Auto-generated from recurring rule"
                                />
                              )}
                            </div>
                            {tx.notes && (
                              <p className="text-xs text-slate-400 truncate max-w-xs">{tx.notes}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center rounded-lg bg-slate-100 dark:bg-navy-800 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
                          {tx.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-medium text-slate-600 dark:text-slate-300">
                        {tx.paymentMethod}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400">
                        {formatDate(tx.date)}
                      </td>
                      <td
                        className={`py-3.5 px-4 text-right font-bold whitespace-nowrap ${
                          tx.type === 'income'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {tx.type === 'income' ? '+' : '-'}
                        {formatCurrency(tx.amount, currency)}
                      </td>
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingTx(tx);
                              setModalOpen(true);
                            }}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-navy-800 dark:hover:text-blue-400 transition-colors"
                            aria-label="Edit transaction"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(tx)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-navy-800 dark:hover:text-rose-400 transition-colors"
                            aria-label="Delete transaction"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 dark:border-navy-800 px-5 py-3.5">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                </p>
                <div className="flex items-center gap-2">
                  <button
                    disabled={pagination.page <= 1}
                    onClick={() => setFilters((p) => ({ ...p, page: p.page - 1 }))}
                    className="btn-secondary py-1.5 px-3 text-xs"
                  >
                    <ChevronLeft className="h-4 w-4" /> Prev
                  </button>
                  <button
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => setFilters((p) => ({ ...p, page: p.page + 1 }))}
                    className="btn-secondary py-1.5 px-3 text-xs"
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <TransactionModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingTx(null);
        }}
        initialData={editingTx}
        onSuccess={fetchTransactions}
      />

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Transaction"
        message={`Are you sure you want to permanently delete "${deleteTarget?.description}" (${formatCurrency(deleteTarget?.amount || 0, currency)})?`}
      />
    </div>
  );
}
