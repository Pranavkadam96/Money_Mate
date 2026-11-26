import React from 'react';

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="card p-5 h-32">
            <div className="h-3 w-24 rounded bg-slate-200 dark:bg-navy-800" />
            <div className="mt-4 h-7 w-32 rounded bg-slate-200 dark:bg-navy-800" />
            <div className="mt-3 h-3 w-20 rounded bg-slate-100 dark:bg-navy-800/70" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card h-80 p-5" />
        <div className="card h-80 p-5" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }) {
  return (
    <div className="space-y-3 animate-pulse p-4">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="h-12 rounded-xl bg-slate-100 dark:bg-navy-800/60" />
      ))}
    </div>
  );
}
