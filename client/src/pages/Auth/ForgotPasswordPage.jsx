import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, ExternalLink } from 'lucide-react';
import AuthShell from '../../components/Auth/AuthShell';
import { api } from '../../services/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.auth.forgotPassword({ email: email.trim() });
      setResult(res);
    } catch (err) {
      setError(err.message || 'Could not process reset request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Forgot password?"
      subtitle="Enter your registered email to generate a secure password reset link."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 px-4 py-3 text-xs font-medium text-rose-600 dark:text-rose-300">
            {error}
          </div>
        )}

        {result && (
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-4 space-y-2">
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              {result.message}
            </p>
            {result.resetToken && (
              <Link
                to={`/reset-password?token=${result.resetToken}`}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
              >
                Proceed to Reset Password
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        )}

        <div>
          <label className="label-text" htmlFor="forgot-email">
            Email Address
          </label>
          <div className="relative">
            <input
              id="forgot-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field pl-10"
            />
            <Mail className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
          {loading ? 'Sending Reset Link...' : 'Send Reset Instructions'}
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
