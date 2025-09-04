import { useEffect, useRef, useCallback } from 'react';

export const useViewportPositioning = (isOpen: boolean, delay = 100) => {
  const elementRef = useRef<HTMLElement>(null);

  const scrollIntoView = useCallback(() => {
    if (elementRef.current && isOpen) {
      // Small delay to ensure element is rendered
      setTimeout(() => {
        elementRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'center'
        });
      }, delay);
    }
  }, [isOpen, delay]);

  useEffect(() => {
    scrollIntoView();
  }, [scrollIntoView]);

  // Handle window resize to reposition if needed
  useEffect(() => {
    if (!isOpen) return;

    const handleResize = () => {
      scrollIntoView();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen, scrollIntoView]);

  return elementRef;
};

export const useResponsivePositioning = () => {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  
  const getPopoverProps = () => ({
    side: isMobile ? "bottom" as const : "bottom" as const,
    align: isMobile ? "center" as const : "start" as const,
    sideOffset: isMobile ? 8 : 4,
    alignOffset: 0,
    avoidCollisions: true,
    collisionPadding: isMobile ? 16 : 8,
    sticky: "always" as const,
  });

  const getDrawerProps = () => ({
    // Always use drawer on mobile for better UX
    shouldScaleBackground: false,
  });

  return {
    isMobile,
    getPopoverProps,
    getDrawerProps,
  };
};