import { useEffect, useState } from 'react';

/**
 * Matches everything below Tailwind's `lg` breakpoint — phones and portrait
 * tablets. The data-heavy consoles swap their tables for card stacks here,
 * which is a markup change rather than a style change, so it cannot be done
 * with CSS alone.
 */
const MOBILE_QUERY = '(max-width: 1023px)';

/**
 * Returns true on small viewports. Always false on the server and for the
 * first client render so the hydrated markup matches the server output; it
 * flips in an effect immediately after mount.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const query = window.matchMedia(MOBILE_QUERY);
    const sync = (): void => setIsMobile(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  return isMobile;
}
