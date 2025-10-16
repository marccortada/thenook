import React from "react";
import { useIsMobile } from "@/hooks/use-mobile";

type AppModalProps = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: number; // desktop max width (px)
  mobileMaxWidth?: number; // mobile max width (px)
  maxHeight?: number; // max height (px)
  viewportPadding?: number; // viewport margin (px)
  className?: string; // additional classes for the container
  // z-index controls for proper stacking with nested modals
  zIndex?: number; // container z-index (overlay will be slightly lower)
  overlayZIndex?: number; // optional explicit overlay z-index
};

export const AppModal: React.FC<AppModalProps> = ({
  open,
  onClose,
  children,
  maxWidth = 500,
  mobileMaxWidth = 350,
  maxHeight = 600,
  viewportPadding = 20,
  className = "",
  zIndex = 50,
  overlayZIndex,
}) => {
  const isMobile = useIsMobile();
  const [position, setPosition] = React.useState({ top: 0, left: 0, width: 0, height: 0 });

  const recalc = React.useCallback(() => {
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;
    const modalWidth = Math.min(isMobile ? mobileMaxWidth : maxWidth, windowWidth - viewportPadding * 2);
    const modalHeight = Math.min(maxHeight, windowHeight - viewportPadding * 2);
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    let top = scrollTop + (windowHeight - modalHeight) / 2;
    let left = (windowWidth - modalWidth) / 2;

    const viewportTop = scrollTop + viewportPadding;
    const viewportBottom = scrollTop + windowHeight - viewportPadding;
    if (top < viewportTop) top = viewportTop;
    else if (top + modalHeight > viewportBottom) top = viewportBottom - modalHeight;
    if (left < viewportPadding) left = viewportPadding;
    if (left + modalWidth > windowWidth - viewportPadding) left = windowWidth - modalWidth - viewportPadding;

    setPosition({ top, left, width: modalWidth, height: modalHeight });
  }, [isMobile, maxHeight, maxWidth, mobileMaxWidth, viewportPadding]);

  React.useEffect(() => {
    if (!open) return;
    recalc();
    const onResize = () => recalc();
    const onScroll = () => recalc();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, recalc, onClose]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50"
        style={{ zIndex: overlayZIndex ?? zIndex - 10 }}
        onClick={onClose}
      />
      <div
        className={"fixed bg-white rounded-lg shadow-2xl border transition-all duration-300 " + className}
        role="dialog"
        aria-modal="true"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
          width: `${position.width}px`,
          maxHeight: `${position.height}px`,
          overflowY: "auto",
          zIndex,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </>
  );
};

export default AppModal;
