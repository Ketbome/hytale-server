import type { AuthStatus, DefaultsCheck, LoginResponse } from '$lib/types';
import { writable } from 'svelte/store';

export const isAuthenticated = writable<boolean>(false);
export const authError = writable<string | null>(null);
export const isUsingDefaults = writable<boolean>(false);
export const isLoading = writable<boolean>(true);

export async function checkStatus(): Promise<boolean> {
  try {
    const res = await fetch('/auth/status');
    if (res.ok) {
      const data: AuthStatus = await res.json();
      isAuthenticated.set(data.authenticated);
      return data.authenticated;
    }
    isAuthenticated.set(false);
    return false;
  } catch {
    isAuthenticated.set(false);
    return false;
  }
}

export async function checkDefaults(): Promise<void> {
  try {
    const res = await fetch('/auth/check-defaults');
    const data: DefaultsCheck = await res.json();
    isUsingDefaults.set(data.usingDefaults);
  } catch {
    // ignore
  }
}

export async function login(username: string, password: string): Promise<boolean> {
  authError.set(null);

  if (!username || !password) {
    authError.set('Enter username and password');
    return false;
  }

  try {
    const res = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data: LoginResponse = await res.json();

    if (res.ok && data.success) {
      isAuthenticated.set(true);
      return true;
    }
    authError.set(data.error || 'Login failed');
    return false;
  } catch {
    authError.set('Connection error');
    return false;
  }
}

export async function logout(): Promise<void> {
  try {
    await fetch('/auth/logout', { method: 'POST' });
  } catch {
    // ignore
  }
  isAuthenticated.set(false);
}
