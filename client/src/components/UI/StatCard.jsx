import React from 'react';

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accent = 'blue',
  trend = null,
}) {
  const accentStyles = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400',
    rose: 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400',
    indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400',
    navy: 'bg-navy-100 text-navy-700 dark:bg-navy-800 dark:text-blue-300',
  };

  return (
    <div className="card-hover p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {title}
          </p>
          <p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white truncate">
            {value}
          </p>
          {subtitle && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 truncate">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
              accentStyles[accent] || accentStyles.blue
            }`}
          >
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
      {trend !== null && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-navy-800 flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400">{trend.label}</span>
          <span className={`font-semibold ${trend.color || 'text-slate-700 dark:text-slate-200'}`}>
            {trend.value}
          </span>
        </div>
      )}
    </div>
  );
}
