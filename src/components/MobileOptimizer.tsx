import { useEffect } from 'react';

// Component to automatically apply mobile optimizations
const MobileOptimizer = () => {
  useEffect(() => {
    // Add mobile-specific classes to body
    document.body.classList.add('mobile-optimized');
    
    // Viewport meta tag optimization
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
    }
    
    // Apply responsive classes to common elements
    const applyResponsiveClasses = () => {
      // Tables
      document.querySelectorAll('table').forEach(table => {
        table.classList.add('table-wrapper-responsive');
      });
      
      // Cards
      document.querySelectorAll('[class*="Card"]').forEach(card => {
        card.classList.add('card-responsive');
      });
      
      // Dialogs
      document.querySelectorAll('[role="dialog"]').forEach(dialog => {
        dialog.classList.add('dialog-responsive');
      });
      
      // Buttons in groups
      document.querySelectorAll('.flex.gap-2, .flex.gap-4').forEach(group => {
        if (group.children.length > 1) {
          group.classList.add('button-group');
        }
      });
      
      // Grids
      document.querySelectorAll('.grid').forEach(grid => {
        if (!grid.classList.contains('grid-responsive') && !grid.classList.contains('grid-responsive-4')) {
          grid.classList.add('grid-responsive');
        }
      });
    };
    
    // Apply classes on mount and whenever DOM changes
    applyResponsiveClasses();
    
    // Observer for dynamic content
    const observer = new MutationObserver(() => {
      applyResponsiveClasses();
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    });
    
    return () => {
      observer.disconnect();
      document.body.classList.remove('mobile-optimized');
    };
  }, []);

  return null;
};

export default MobileOptimizer;