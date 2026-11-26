import React, { useState } from 'react';
import { User, Lock, Save, Sun, Moon, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { CURRENCIES } from '../constants/finance';
import { api } from '../services/api';

export default function SettingsPage() {
  const { user, updateProfile, theme, toggleTheme } = useAuth();
  const { showToast } = useToast();

  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    occupation: user?.occupation || '',
    currency: user?.currency || 'INR',
    monthlyBudgetDefault: String(user?.monthlyBudgetDefault || ''),
    notificationsEnabled: user?.notificationsEnabled ?? true,
  });
  const [savingProfile, setSavingProfile] = useState(false);

  const [pwForm, setPwForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [savingPw, setSavingPw] = useState(false);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!profileForm.name.trim() || profileForm.name.trim().length < 2) {
      showToast('Name must be at least 2 characters.', 'error');
      return;
    }

    setSavingProfile(true);
    try {
      await updateProfile({
        name: profileForm.name.trim(),
        phone: profileForm.phone.trim(),
        occupation: profileForm.occupation.trim(),
        currency: profileForm.currency,
        monthlyBudgetDefault: Number(profileForm.monthlyBudgetDefault || 0),
        notificationsEnabled: profileForm.notificationsEnabled,
      });
      showToast('Profile settings saved!', 'success');
      window.dispatchEvent(new Event('moneymate:data-updated'));
    } catch (err) {
      showToast(err.message || 'Failed to update profile.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!pwForm.currentPassword || !pwForm.newPassword) {
      showToast('Please fill in all password fields.', 'error');
      return;
    }
    if (pwForm.newPassword.length < 6) {
      showToast('New password must be at least 6 characters.', 'error');
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      showToast('New passwords do not match.', 'error');
      return;
    }

    setSavingPw(true);
    try {
      await api.auth.changePassword({
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showToast('Password changed successfully!', 'success');
    } catch (err) {
      showToast(err.message || 'Could not change password.', 'error');
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up max-w-4xl">
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
          Profile & Preferences
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Manage your personal details, currency preference, appearance, and account security.
        </p>
      </div>

      {/* Profile & Preferences Card */}
      <form onSubmit={handleProfileSubmit} className="card p-6 space-y-5">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-navy-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
            <User className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Personal Profile</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Your account details and financial defaults
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label-text" htmlFor="set-name">
              Full Name
            </label>
            <input
              id="set-name"
              type="text"
              value={profileForm.name}
              onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
              className="input-field"
            />
          </div>

          <div>
            <label className="label-text" htmlFor="set-email">
              Email Address
            </label>
            <input
              id="set-email"
              type="email"
              value={user?.email || ''}
              disabled
              className="input-field opacity-65 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="label-text" htmlFor="set-phone">
              Phone (Optional)
            </label>
            <input
              id="set-phone"
              type="text"
              placeholder="+91 98765 43210"
              value={profileForm.phone}
              onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
              className="input-field"
            />
          </div>

          <div>
            <label className="label-text" htmlFor="set-occupation">
              Occupation / Role
            </label>
            <input
              id="set-occupation"
              type="text"
              placeholder="e.g., Software Engineer, Student"
              value={profileForm.occupation}
              onChange={(e) => setProfileForm({ ...profileForm, occupation: e.target.value })}
              className="input-field"
            />
          </div>

          <div>
            <label className="label-text" htmlFor="set-currency">
              Display Currency
            </label>
            <select
              id="set-currency"
              value={profileForm.currency}
              onChange={(e) => setProfileForm({ ...profileForm, currency: e.target.value })}
              className="input-field"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.symbol} {c.code} — {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label-text" htmlFor="set-default-budget">
              Default Monthly Budget Fallback
            </label>
            <input
              id="set-default-budget"
              type="number"
              min="0"
              step="0.01"
              placeholder="0"
              value={profileForm.monthlyBudgetDefault}
              onChange={(e) =>
                setProfileForm({ ...profileForm, monthlyBudgetDefault: e.target.value })
              }
              className="input-field"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Theme Switcher */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-navy-700 p-4">
            <div className="flex items-center gap-3">
              {theme === 'dark' ? (
                <Moon className="h-5 w-5 text-blue-400" />
              ) : (
                <Sun className="h-5 w-5 text-amber-500" />
              )}
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">Appearance</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Currently in {theme === 'dark' ? 'Dark' : 'Light'} Mode
                </p>
              </div>
            </div>
            <button type="button" onClick={toggleTheme} className="btn-secondary text-xs py-1.5 px-3">
              Switch to {theme === 'dark' ? 'Light' : 'Dark'}
            </button>
          </div>

          {/* Alerts Toggle */}
          <label className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-navy-700 p-4 cursor-pointer">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">Smart Alerts</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Budget warnings & goal milestones
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={profileForm.notificationsEnabled}
              onChange={(e) =>
                setProfileForm({ ...profileForm, notificationsEnabled: e.target.checked })
              }
              className="h-4.5 w-4.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
          </label>
        </div>

        <div className="flex justify-end pt-2">
          <button type="submit" className="btn-primary" disabled={savingProfile}>
            <Save className="h-4 w-4" />
            {savingProfile ? 'Saving Changes...' : 'Save Profile'}
          </button>
        </div>
      </form>

      {/* Change Password Card */}
      <form onSubmit={handlePasswordSubmit} className="card p-6 space-y-5">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-navy-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Security</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Update your account password
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="label-text" htmlFor="pw-current">
              Current Password
            </label>
            <input
              id="pw-current"
              type="password"
              value={pwForm.currentPassword}
              onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
              className="input-field"
            />
          </div>
          <div>
            <label className="label-text" htmlFor="pw-new">
              New Password
            </label>
            <input
              id="pw-new"
              type="password"
              value={pwForm.newPassword}
              onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
              className="input-field"
            />
          </div>
          <div>
            <label className="label-text" htmlFor="pw-confirm">
              Confirm New Password
            </label>
            <input
              id="pw-confirm"
              type="password"
              value={pwForm.confirmPassword}
              onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
              className="input-field"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" className="btn-secondary" disabled={savingPw}>
            {savingPw ? 'Updating...' : 'Change Password'}
          </button>
        </div>
      </form>
    </div>
  );
}
