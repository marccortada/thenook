const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  if (typeof window === 'undefined') return false;
  try {
    return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`).matches;
  } catch {
    return window.innerWidth < MOBILE_BREAKPOINT;
  }
}
