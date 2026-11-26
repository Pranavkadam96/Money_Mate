import React, { useEffect, useState, useRef, useCallback } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowLeftRight,
  PiggyBank,
  BarChart3,
  Target,
  Repeat,
  Settings,
  LogOut,
  Menu,
  X,
  Plus,
  Bell,
  Sun,
  Moon,
  Wallet,
  CheckCheck,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { CURRENCIES } from '../../constants/finance';
import { api } from '../../services/api';
import TransactionModal from '../Transactions/TransactionModal';
import { formatDate } from '../../utils/format';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/budgets', label: 'Budgets', icon: PiggyBank },
  { to: '/analytics', label: 'Analytics & Reports', icon: BarChart3 },
  { to: '/goals', label: 'Savings Goals', icon: Target },
  { to: '/recurring', label: 'Recurring', icon: Repeat },
  { to: '/settings', label: 'Profile & Settings', icon: Settings },
];

export default function AppLayout() {
  const { user, logout, theme, toggleTheme, updateProfile } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await api.notifications.list();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // Ignore silent background notification poll failure
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const onDataUpdated = () => fetchNotifications();
    window.addEventListener('moneymate:data-updated', onDataUpdated);
    return () => window.removeEventListener('moneymate:data-updated', onDataUpdated);
  }, [fetchNotifications]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await api.notifications.markRead(id);
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      showToast('Failed to update notification.', 'error');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.notifications.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      showToast('Failed to mark notifications as read.', 'error');
    }
  };

  const handleDeleteNotification = async (id) => {
    try {
      const target = notifications.find((n) => n._id === id);
      await api.notifications.remove(id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      if (target && !target.isRead) setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      showToast('Failed to remove notification.', 'error');
    }
  };

  const handleCurrencyQuickChange = async (e) => {
    const nextCurrency = e.target.value;
    try {
      await updateProfile({ currency: nextCurrency });
      showToast(`Currency updated to ${nextCurrency}.`, 'success');
      window.dispatchEvent(new Event('moneymate:data-updated'));
    } catch (err) {
      showToast(err.message || 'Could not update currency.', 'error');
    }
  };

  const activeNav = NAV_ITEMS.find((item) => location.pathname.startsWith(item.to));
  const initials = (user?.name || 'U')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-gradient-to-b from-navy-950 via-navy-900 to-navy-950 text-white">
      {/* Brand */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-600/30">
            <Wallet className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-extrabold tracking-tight text-white">MoneyMate</span>
            <p className="text-[11px] font-medium text-blue-200/70">Smart Expense Tracker</p>
          </div>
        </div>
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden rounded-lg p-1.5 text-slate-300 hover:bg-white/10"
          aria-label="Close navigation"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 space-y-1 px-3 py-5 overflow-y-auto">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md shadow-blue-600/25'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <Icon className="h-4.5 w-4.5 shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User Card */}
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 text-sm font-bold text-white">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
            <p className="truncate text-xs text-slate-400">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-rose-600/80 hover:border-rose-500 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-navy-950">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block lg:w-64 lg:shrink-0 lg:sticky lg:top-0 lg:h-screen">
        <SidebarContent />
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-navy-950/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-10 w-72 max-w-[85vw] h-full shadow-2xl">
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-30 border-b border-slate-200/80 dark:border-navy-800 bg-white/85 dark:bg-navy-900/85 backdrop-blur-md">
          <div className="flex items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 py-3.5">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden rounded-xl border border-slate-200 dark:border-navy-700 p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-navy-800"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white truncate">
                  {activeNav?.label || 'MoneyMate'}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Currency Selector */}
              <select
                aria-label="Select Currency"
                value={user?.currency || 'INR'}
                onChange={handleCurrencyQuickChange}
                className="hidden sm:block rounded-xl border border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-800 px-2.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.symbol} {c.code}
                  </option>
                ))}
              </select>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-navy-700 transition-colors"
                aria-label="Toggle theme"
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {theme === 'dark' ? <Sun className="h-4.5 w-4.5 text-amber-400" /> : <Moon className="h-4.5 w-4.5" />}
              </button>

              {/* Notifications */}
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => setNotifOpen((o) => !o)}
                  className="relative rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-navy-700 transition-colors"
                  aria-label="Notifications"
                >
                  <Bell className="h-4.5 w-4.5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900 shadow-card-lg z-50 overflow-hidden animate-fade-in-up">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-navy-800 px-4 py-3">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        Notifications ({unreadCount} unread)
                      </span>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          <CheckCheck className="h-3.5 w-3.5" />
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-navy-800">
                      {notifications.length === 0 ? (
                        <p className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                          You're all caught up! No notifications yet.
                        </p>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n._id}
                            className={`p-3.5 flex items-start gap-3 transition-colors ${
                              !n.isRead ? 'bg-blue-50/50 dark:bg-blue-950/30' : ''
                            }`}
                          >
                            <div
                              className={`mt-1 h-2 w-2 rounded-full shrink-0 ${
                                n.type === 'budget_exceeded'
                                  ? 'bg-rose-500'
                                  : n.type === 'budget_warning'
                                  ? 'bg-amber-500'
                                  : n.type === 'goal_milestone'
                                  ? 'bg-emerald-500'
                                  : 'bg-blue-500'
                              }`}
                            />
                            <div
                              className="flex-1 min-w-0 cursor-pointer"
                              onClick={() => !n.isRead && handleMarkRead(n._id)}
                            >
                              <p className="text-xs font-bold text-slate-900 dark:text-white">
                                {n.title}
                              </p>
                              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                                {n.message}
                              </p>
                              <p className="text-[10px] text-slate-400 mt-1">
                                {formatDate(n.createdAt)}
                              </p>
                            </div>
                            <button
                              onClick={() => handleDeleteNotification(n._id)}
                              className="text-slate-400 hover:text-rose-500 p-1"
                              aria-label="Delete notification"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Add Transaction Quick CTA */}
              <button
                onClick={() => setTxModalOpen(true)}
                className="btn-primary py-2 px-3 sm:px-4 text-xs sm:text-sm"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Transaction</span>
                <span className="sm:hidden">Add</span>
              </button>
            </div>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      <TransactionModal
        isOpen={txModalOpen}
        onClose={() => setTxModalOpen(false)}
      />
    </div>
  );
}
