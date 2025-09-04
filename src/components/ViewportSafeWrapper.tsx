import React, { useEffect, useRef } from 'react';
import { useViewportPositioning } from '@/hooks/useViewportPositioning';

interface ViewportSafeWrapperProps {
  children: React.ReactNode;
  isOpen?: boolean;
  autoScroll?: boolean;
  delay?: number;
  className?: string;
}

export const ViewportSafeWrapper: React.FC<ViewportSafeWrapperProps> = ({
  children,
  isOpen = false,
  autoScroll = true,
  delay = 100,
  className,
}) => {
  const elementRef = useViewportPositioning(isOpen && autoScroll, delay);
  const divRef = useRef<HTMLDivElement>(null);

  // Sync refs
  useEffect(() => {
    if (elementRef && divRef.current) {
      (elementRef as any).current = divRef.current;
    }
  }, [elementRef]);

  return (
    <div ref={divRef} className={className}>
      {children}
    </div>
  );
};

// Hook para componentes que necesitan centrarse en la pantalla cuando se abren
export const useCenterOnOpen = (isOpen: boolean, delay = 100) => {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !elementRef.current) return;

    const timeoutId = setTimeout(() => {
      if (elementRef.current) {
        const rect = elementRef.current.getBoundingClientRect();
        const isVisible = (
          rect.top >= 0 &&
          rect.left >= 0 &&
          rect.bottom <= window.innerHeight &&
          rect.right <= window.innerWidth
        );

        if (!isVisible) {
          elementRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'center'
          });
        }
      }
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [isOpen, delay]);

  return elementRef;
};

// Hook para elementos dropdown/popover que necesitan mantenerse en el viewport
export const useStayInViewport = (isOpen: boolean) => {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !elementRef.current) return;

    const element = elementRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting && isOpen) {
            entry.target.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
              inline: 'center'
            });
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '-20px'
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [isOpen]);

  return elementRef;
};