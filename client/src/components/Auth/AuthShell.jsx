import React from 'react';
import { Wallet, ShieldCheck, TrendingUp, PieChart } from 'lucide-react';

export default function AuthShell({ title, subtitle, children }) {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-slate-50 dark:bg-navy-950">
      {/* Brand Showcase Panel */}
      <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-navy-950 via-navy-900 to-blue-900 p-12 text-white relative overflow-hidden">
        <div className="absolute -top-24 -right-24 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-600/30">
            <Wallet className="h-6 w-6 text-white" />
          </div>
          <div>
            <span className="text-xl font-extrabold tracking-tight">MoneyMate</span>
            <p className="text-xs text-blue-200/75">Smart Expense Tracker</p>
          </div>
        </div>

        <div className="relative z-10 max-w-md space-y-6">
          <h2 className="text-4xl font-extrabold leading-tight tracking-tight">
            Take total control of your personal finances.
          </h2>
          <p className="text-sm text-blue-100/80 leading-relaxed">
            Track daily income and expenses, enforce smart category budgets, analyze spending trends,
            and reach your savings goals faster — all in one secure workspace.
          </p>

          <div className="space-y-3.5 pt-2">
            {[
              {
                icon: TrendingUp,
                title: 'Real-Time Cash Flow Insights',
                desc: 'Interactive Recharts analytics across daily, weekly, monthly, and yearly horizons.',
              },
              {
                icon: PieChart,
                title: 'Smart Budget Alerts',
                desc: 'Get notified automatically before category spending exceeds your monthly limit.',
              },
              {
                icon: ShieldCheck,
                title: 'Private & Secure by Design',
                desc: 'Encrypted credentials and strictly isolated user financial ledgers.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex items-start gap-3.5 rounded-2xl bg-white/5 border border-white/10 p-4 backdrop-blur-sm"
              >
                <item.icon className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-white">{item.title}</p>
                  <p className="text-xs text-blue-100/70 mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs text-blue-200/50">
          © {new Date().getFullYear()} MoneyMate Personal Finance Platform
        </p>
      </div>

      {/* Form Panel */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2.5 lg:hidden mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-navy-800">
              <Wallet className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-extrabold text-slate-900 dark:text-white">MoneyMate</span>
          </div>

          <div className="card p-7 sm:p-8 shadow-card-lg">
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">{title}</h1>
            {subtitle && (
              <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
            )}
            <div className="mt-6">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
