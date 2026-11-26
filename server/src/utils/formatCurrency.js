import { CURRENCIES } from '../constants/categories.js';

export function formatAmount(amount, currencyCode = 'INR') {
  const cfg = CURRENCIES[currencyCode] || CURRENCIES.INR;
  return new Intl.NumberFormat(cfg.locale, {
    style: 'currency',
    currency: cfg.code,
    maximumFractionDigits: currencyCode === 'JPY' ? 0 : 2,
  }).format(Number(amount) || 0);
}
