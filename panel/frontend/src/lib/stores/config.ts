import { writable, get } from 'svelte/store';

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
    // Try to get config from the current path or root
    const paths = ['/panel-config', `${window.location.pathname.replace(/\/$/, '')}/panel-config`];
    
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
