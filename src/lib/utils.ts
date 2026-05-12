import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatVoltage(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return "—";
  return `${v.toFixed(2)} V`;
}

export function formatCurrent(a: number | null | undefined): string {
  if (a == null || Number.isNaN(a)) return "—";
  return `${a.toFixed(1)} A`;
}

export function formatMilliOhms(m: number | null | undefined): string {
  if (m == null || Number.isNaN(m)) return "—";
  return `${m.toFixed(1)} mΩ`;
}

export function formatPercent(p: number | null | undefined): string {
  if (p == null || Number.isNaN(p)) return "—";
  return `${Math.round(p)}%`;
}

export function formatDate(ms: number | undefined): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleDateString();
}

export function formatDateTime(ms: number | undefined): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleString();
}
