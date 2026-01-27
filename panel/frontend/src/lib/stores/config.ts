import { get, writable } from 'svelte/store';

export interface PanelConfig {
  basePath: string;
  authDisabled: boolean;
  loaded: boolean;
}

export const panelConfig = writable<PanelConfig>({
  basePath: '',
  authDisabled: false,
  loaded: false
});

export async function loadPanelConfig(): Promise<void> {
  try {
    // Build all possible base paths from current URL
    // e.g., /panel/dashboard -> ['/panel/dashboard', '/panel', '']
    const segments = window.location.pathname.replace(/\/$/, '').split('/').filter(Boolean);
    const paths: string[] = [];
    for (let i = segments.length; i >= 0; i--) {
      const base = i > 0 ? `/${segments.slice(0, i).join('/')}` : '';
      paths.push(`${base}/panel-config`);
    }

    for (const path of paths) {
      try {
        const res = await fetch(path);
        if (res.ok) {
          const data = await res.json();
          panelConfig.set({
            basePath: data.basePath || '',
            authDisabled: data.authDisabled || false,
            loaded: true
          });
          return;
        }
      } catch {
        // Try next path
      }
    }

    // Default config if fetch fails
    panelConfig.set({ basePath: '', authDisabled: false, loaded: true });
  } catch {
    panelConfig.set({ basePath: '', authDisabled: false, loaded: true });
  }
}

// Helper to build API URLs with base path
export function apiUrl(path: string): string {
  const config = get(panelConfig);
  const base = config.basePath || '';
  return `${base}${path}`;
}
