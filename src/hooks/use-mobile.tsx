const MOBILE_BREAKPOINT = 768

// Non-hook utility shaped like a hook to avoid duplicate-React issues in hosted preview.
// Returns a responsive boolean using matchMedia without subscribing.
export function useIsMobile() {
  if (typeof window === 'undefined') return false;
  try {
    return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`).matches;
  } catch {
    return window.innerWidth < MOBILE_BREAKPOINT;
  }
}
