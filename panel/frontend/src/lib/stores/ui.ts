import type { TabId, Toast, ToastType } from '$lib/types';
import { writable } from 'svelte/store';

export const activeTab = writable<TabId>('control');
export const sidebarHidden = writable<boolean>(false);
export const panelExpanded = writable<boolean>(false);
export const toasts = writable<Toast[]>([]);

let toastId = 0;

export function showToast(message: string, type: ToastType = ''): void {
  const id = ++toastId;
  toasts.update((t) => [...t, { id, message, type }]);

  setTimeout(() => {
    toasts.update((t) => t.filter((toast) => toast.id !== id));
  }, 4000);
}
