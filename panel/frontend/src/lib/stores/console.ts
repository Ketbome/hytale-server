import type { LogEntry, LogType } from '$lib/types';
import { writable } from 'svelte/store';

export const logs = writable<LogEntry[]>([]);
export const autoScroll = writable<boolean>(true);
export const isLoadingMore = writable<boolean>(false);
export const hasMoreHistory = writable<boolean>(true);
export const loadedCount = writable<number>(0);
export const initialLoadDone = writable<boolean>(false);

export function addLog(text: string, type: LogType = '', timestamp: string | null = null): void {
  logs.update((current) => {
    const ts = timestamp || getCurrentTimestamp();
    const lines = cleanLog(text)
      .split('\n')
      .filter((l) => l.trim());
    const newLogs: LogEntry[] = lines.map((line) => ({
      text: line.trim(),
      type: type || getLogType(line),
      timestamp: ts
    }));

    const updated = [...current, ...newLogs];
    if (updated.length > 1000) {
      return updated.slice(-1000);
    }
    return updated;
  });
}

export function prependLogs(newLogs: LogEntry[]): void {
  logs.update((current) => [...newLogs, ...current]);
}

export function clearLogs(): void {
  logs.set([]);
  hasMoreHistory.set(true);
  loadedCount.set(0);
  initialLoadDone.set(false);
}

function getCurrentTimestamp(): string {
  const now = new Date();
  const d = String(now.getDate()).padStart(2, '0');
  const mo = String(now.getMonth() + 1).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  return `[${d}/${mo} ${h}:${m}:${s}]`;
}

export function formatTimestamp(isoString: string | null): string {
  if (!isoString) return getCurrentTimestamp();
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return getCurrentTimestamp();

  const day = String(d.getDate()).padStart(2, '0');
  const mon = String(d.getMonth() + 1).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `[${day}/${mon} ${h}:${m}:${s}]`;
}

export function extractTimestamp(line: string): string | null {
  const match = line.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)/);
  return match ? match[1] : null;
}

function cleanLog(text: string): string {
  const ansiEscape = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');
  return text
    .replace(ansiEscape, '')
    .replace(/\[\d*;?\d*m/g, '')
    .replace(/\[0?m/g, '')
    .replace(/\[38;5;\d+m/g, '')
    .replace(/^\d{2}T\d{2}:\d{2}:\d{2}[.\d]*Z?\s*/gm, '')
    .replace(/^\d{4}[-/]\d{2}[-/]\d{2}[T ]\d{2}:\d{2}:\d{2}[.\d]*Z?\s*/gm, '')
    .replace(/^\[\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2}\s+\w+\]\s*/gm, '');
}

export function getLogType(text: string): LogType {
  if (text.startsWith('>')) return 'cmd';
  const lower = text.toLowerCase();
  if (lower.includes('error') || lower.includes('failed') || lower.includes('exception')) return 'error';
  if (lower.includes('warn')) return 'warn';
  if (lower.includes('oauth') || lower.includes('user_code') || lower.includes('authorization')) return 'auth';
  if (
    lower.includes('success') ||
    lower.includes('complete') ||
    lower.includes('started') ||
    lower.includes('initialized')
  )
    return 'info';
  return '';
}
