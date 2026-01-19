import type { InstalledMod, ModProject, ModUpdate } from '$lib/types';
import { writable } from 'svelte/store';

export type ModView = 'installed' | 'browse' | 'updates';

export const installedMods = writable<InstalledMod[]>([]);
export const searchResults = writable<ModProject[]>([]);
export const availableUpdates = writable<ModUpdate[]>([]);
export const currentView = writable<ModView>('installed');
export const currentPage = writable<number>(1);
export const hasMore = writable<boolean>(false);
export const total = writable<number>(0);
export const apiConfigured = writable<boolean>(false);
export const isModsLoading = writable<boolean>(false);
