import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { KeyRound, ArrowLeft } from 'lucide-react';
import AuthShell from '../../components/Auth/AuthShell';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [token, setToken] = useState(() => searchParams.get('token') || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!token.trim()) {
      setError('Reset token is required.');
      return;
    }
    if (password.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.auth.resetPassword({ token: token.trim(), password });
      showToast(res.message || 'Password reset successfully.', 'success');
      navigate('/login');
    } catch (err) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Choose a strong new password for your MoneyMate account."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 px-4 py-3 text-xs font-medium text-rose-600 dark:text-rose-300">
            {error}
          </div>
        )}

        {!searchParams.get('token') && (
          <div>
            <label className="label-text" htmlFor="reset-token">
              Reset Token
            </label>
            <input
              id="reset-token"
              type="text"
              placeholder="Paste your reset token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="input-field"
            />
          </div>
        )}

        <div>
          <label className="label-text" htmlFor="reset-pass">
            New Password
          </label>
          <input
            id="reset-pass"
            type="password"
            placeholder="Minimum 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field"
          />
        </div>

        <div>
          <label className="label-text" htmlFor="reset-confirm">
            Confirm New Password
          </label>
          <input
            id="reset-confirm"
            type="password"
            placeholder="Re-enter new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="input-field"
          />
        </div>

        <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
          <KeyRound className="h-4 w-4" />
          {loading ? 'Updating Password...' : 'Reset Password'}
        </button>

        <div className="text-center pt-2">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Sign In
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}
