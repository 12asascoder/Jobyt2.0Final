import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatDate = (date: string | Date, opts?: Intl.DateTimeFormatOptions): string =>
  new Date(date).toLocaleDateString('en-IN', opts ?? { day: 'numeric', month: 'short', year: 'numeric' });

export const formatCurrency = (amount: number, currency = 'INR'): string =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);

export const formatSalaryRange = (min: number | null, max: number | null): string => {
  if (!min && !max) return 'Not disclosed';
  if (!max) return `${formatCurrency(min!)}+`;
  if (!min) return `Up to ${formatCurrency(max)}`;
  return `${formatCurrency(min)} – ${formatCurrency(max)}`;
};

export const truncate = (str: string, length: number): string =>
  str.length > length ? str.slice(0, length) + '…' : str;

export const pluralize = (count: number, word: string): string =>
  `${count} ${word}${count !== 1 ? 's' : ''}`;
