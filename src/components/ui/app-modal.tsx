import React from "react";
import { createPortal } from "react-dom";
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
  centered?: boolean; // use transform centering strategy
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
  centered = true,
}) => {
  const isMobile = useIsMobile();
  const [position, setPosition] = React.useState({ top: 0, left: 0, width: 0, height: 0 });

  const recalc = React.useCallback(() => {
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;
    const modalWidth = Math.min(isMobile ? mobileMaxWidth : maxWidth, windowWidth - viewportPadding * 2);
    const modalHeight = Math.min(maxHeight, windowHeight - viewportPadding * 2);

    // We keep top/left for non-centered strategy, but for centered we only need width/height
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const top = scrollTop + (windowHeight - modalHeight) / 2;
    const left = (windowWidth - modalWidth) / 2;
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
    // Prevent background scroll and fix containing block issues
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.classList.add("app-modal-open");
    document.body.classList.add("app-modal-open");
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      document.documentElement.classList.remove("app-modal-open");
      document.body.classList.remove("app-modal-open");
    };
  }, [open, recalc, onClose]);

  if (!open) return null;

  return createPortal(
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
          top: centered ? "50%" : `${position.top}px`,
          left: centered ? "50%" : `${position.left}px`,
          transform: centered ? "translate(-50%, -50%)" : undefined,
          width: position.width ? `${position.width}px` : "min(90vw, 520px)",
          maxHeight: position.height ? `${position.height}px` : "min(85vh, 720px)",
          overflowY: "auto",
          zIndex,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </>,
    document.body
  );
};

export default AppModal;
