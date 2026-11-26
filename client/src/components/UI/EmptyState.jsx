import React from 'react';

export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      {Icon && (
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-navy-800 text-slate-400 dark:text-slate-400 mb-4">
          <Icon className="h-7 w-7" />
        </div>
      )}
      <h4 className="text-base font-bold text-slate-900 dark:text-white">{title}</h4>
      <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400 max-w-md">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
