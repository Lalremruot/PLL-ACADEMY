import { useCallback, useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';

/** Read by the inline bootstrap script in app/layout.tsx and by this hook. */
export const THEME_STORAGE_KEY = 'academy_theme';

/**
 * The palette lives entirely in CSS: `app/globals.css` redefines the
 * `--color-brand-*` tokens under `html[data-theme="light"]`, so flipping the
 * attribute repaints every component. This hook only owns the attribute and
 * its persistence.
 *
 * The attribute is set before first paint by the bootstrap script in the
 * document head, so the state starts at 'dark' (matching the server render)
 * and syncs to the real value in an effect, the same way `useIsMobile` does.
 */
export function useTheme(): { theme: Theme; toggleTheme: () => void } {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
  }, []);

  const toggleTheme = useCallback((): void => {
    setTheme((current) => {
      const next: Theme = current === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        // Private-mode / blocked storage: the theme still applies for this session.
      }
      return next;
    });
  }, []);

  return { theme, toggleTheme };
}
