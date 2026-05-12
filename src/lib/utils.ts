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

export function formatRelativeTime(ms: number | undefined, now = Date.now()): string {
  if (!ms) return "—";
  const diff = now - ms;
  if (diff < 0) return "just now";
  const sec = Math.floor(diff / 1000);
  if (sec < 45) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} d ago`;
  return new Date(ms).toLocaleDateString();
}
