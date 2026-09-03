import { useState, useEffect } from 'react';

/**
 * Hook to detect whether the user is on a mobile viewport (< 768px).
 * Automatically updates on window resize and orientation change.
 */
export function useIsMobile(breakpoint: number = 768): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < breakpoint;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const check = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    // Run check on mount
    check();

    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);

    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
    };
  }, [breakpoint]);

  return isMobile;
}
