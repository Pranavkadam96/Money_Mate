import { CURRENCIES } from '../constants/finance';

export function getCurrencyConfig(code = 'INR') {
  return CURRENCIES.find((c) => c.code === code) || CURRENCIES[0];
}

export function formatCurrency(amount, currencyCode = 'INR') {
  const cfg = getCurrencyConfig(currencyCode);
  return new Intl.NumberFormat(cfg.locale, {
    style: 'currency',
    currency: cfg.code,
    maximumFractionDigits: cfg.code === 'JPY' ? 0 : 2,
  }).format(Number(amount) || 0);
}

export function formatCompactCurrency(amount, currencyCode = 'INR') {
  const cfg = getCurrencyConfig(currencyCode);
  return new Intl.NumberFormat(cfg.locale, {
    style: 'currency',
    currency: cfg.code,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Number(amount) || 0);
}

export function formatDate(dateInput) {
  if (!dateInput) return '—';
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateInput(dateInput = new Date()) {
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
