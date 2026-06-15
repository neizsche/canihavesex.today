import * as React from 'react';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'theme';

// Dark is the product default. Light is opt-in via the toggle in Settings.
const DEFAULT_THEME: Theme = 'dark';

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

// Seed from the live `.dark` class, which the no-flash inline script in
// AppLayout already set (from localStorage / default) before React mounts.
// Reading it here means the first render is already correct — no flicker.
function getInitialTheme(): Theme {
  if (typeof document !== 'undefined') {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  }
  return DEFAULT_THEME;
}

export function useTheme() {
  const [theme, setThemeState] = React.useState<Theme>(getInitialTheme);

  const setTheme = React.useCallback((next: Theme) => {
    setThemeState(next);
    applyTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore — non-critical persistence
    }
  }, []);

  const toggleTheme = React.useCallback(() => {
    setThemeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  return { theme, setTheme, toggleTheme };
}
