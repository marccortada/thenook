import * as React from "react";
import { useIsMobile } from "@/hooks/use-mobile";

export interface PositionedModalConfig {
  anchorSelector?: string | null;
  desktopWidth?: number;
  mobileWidth?: number;
  desktopMaxHeight?: number;
  mobileMaxHeight?: number;
  verticalOffset?: number;
  viewportMargin?: number;
}

interface ModalCoordinates {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
}

export const DEFAULT_POSITIONED_MODAL_CONFIG: Required<PositionedModalConfig> = {
  anchorSelector: ".client-card",
  desktopWidth: 500,
  mobileWidth: 350,
  desktopMaxHeight: 600,
  mobileMaxHeight: 0,
  verticalOffset: 50,
  viewportMargin: 20,
};

type ModalOpenEvent =
  | React.MouseEvent<HTMLElement>
  | React.KeyboardEvent<HTMLElement>
  | React.TouchEvent<HTMLElement>;

const getScrollTop = () =>
  window.pageYOffset || document.documentElement.scrollTop || 0;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const computeModalCoordinates = ({
  anchor,
  isMobile,
  config,
}: {
  anchor?: HTMLElement | null;
  isMobile: boolean;
  config?: PositionedModalConfig;
}): ModalCoordinates | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const merged = {
    ...DEFAULT_POSITIONED_MODAL_CONFIG,
    ...config,
  };

  const windowHeight = window.innerHeight;
  const windowWidth = window.innerWidth;
  const scrollTop = getScrollTop();

  const horizontalPadding = isMobile ? 20 : 40;
  const verticalPadding = isMobile ? 40 : 80;

  const width = Math.min(
    isMobile ? merged.mobileWidth : merged.desktopWidth,
    Math.max(windowWidth - horizontalPadding, 240)
  );

  const maxHeight = Math.min(
    isMobile
      ? merged.mobileMaxHeight && merged.mobileMaxHeight > 0
        ? merged.mobileMaxHeight
        : windowHeight - verticalPadding
      : merged.desktopMaxHeight,
    windowHeight - verticalPadding
  );

  let top: number;

  if (anchor) {
    const rect = anchor.getBoundingClientRect();
    top = rect.top + scrollTop - merged.verticalOffset;
  } else {
    top = scrollTop + (windowHeight - maxHeight) / 2;
  }

  const viewportTop = scrollTop + merged.viewportMargin;
  const viewportBottom = scrollTop + windowHeight - merged.viewportMargin;

  const maxTop = Math.max(viewportBottom - maxHeight, viewportTop);
  top = clamp(top, viewportTop, maxTop);

  let left = (windowWidth - width) / 2;
  const maxLeft = Math.max(
    windowWidth - width - merged.viewportMargin,
    merged.viewportMargin
  );
  left = clamp(left, merged.viewportMargin, maxLeft);

  return {
    top,
    left,
    width,
    maxHeight,
  };
};

export const usePositionedModal = (
  {
    anchorSelector = DEFAULT_POSITIONED_MODAL_CONFIG.anchorSelector,
    desktopWidth = DEFAULT_POSITIONED_MODAL_CONFIG.desktopWidth,
    mobileWidth = DEFAULT_POSITIONED_MODAL_CONFIG.mobileWidth,
    desktopMaxHeight = DEFAULT_POSITIONED_MODAL_CONFIG.desktopMaxHeight,
    mobileMaxHeight,
    verticalOffset = DEFAULT_POSITIONED_MODAL_CONFIG.verticalOffset,
    viewportMargin = DEFAULT_POSITIONED_MODAL_CONFIG.viewportMargin,
    open: controlledOpen,
    onOpenChange,
  }: PositionedModalConfig & {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  } = {}
) => {
  const isMobile = useIsMobile();
  const isControlled = controlledOpen !== undefined;

  const [internalOpen, setInternalOpen] = React.useState<boolean>(
    controlledOpen ?? false
  );
  const [coordinates, setCoordinates] = React.useState<ModalCoordinates | null>(null);
  const anchorRef = React.useRef<HTMLElement | null>(null);

  const currentOpen = isControlled ? !!controlledOpen : internalOpen;

  React.useEffect(() => {
    if (isControlled) {
      setInternalOpen(!!controlledOpen);
    }
  }, [controlledOpen, isControlled]);

  const calculateAndStore = React.useCallback(
    (
      anchorElement: HTMLElement | null,
      overrides?: PositionedModalConfig
    ) => {
      const nextCoordinates = computeModalCoordinates({
        anchor: anchorElement,
        isMobile,
        config: {
          anchorSelector,
          desktopWidth,
          mobileWidth,
          desktopMaxHeight,
          mobileMaxHeight,
          verticalOffset,
          viewportMargin,
          ...overrides,
        },
      });

      if (nextCoordinates) {
        setCoordinates(nextCoordinates);
      }
    },
    [
      anchorSelector,
      desktopMaxHeight,
      desktopWidth,
      isMobile,
      mobileMaxHeight,
      mobileWidth,
      verticalOffset,
      viewportMargin,
    ]
  );

  const setOpenState = React.useCallback(
    (open: boolean) => {
      if (!isControlled) {
        setInternalOpen(open);
      }
      onOpenChange?.(open);
    },
    [isControlled, onOpenChange]
  );

  const resolveAnchor = React.useCallback(
    (
      eventAnchor: HTMLElement | null,
      overrides?: PositionedModalConfig
    ): HTMLElement | null => {
      const selector = overrides?.anchorSelector ?? anchorSelector;
      if (!eventAnchor || !selector) {
        return eventAnchor;
      }
      const match = eventAnchor.closest(selector);
      return (match as HTMLElement) ?? eventAnchor;
    },
    [anchorSelector]
  );

  const handleOpenModal = React.useCallback(
    (
      event?: ModalOpenEvent,
      overrides?: PositionedModalConfig
    ) => {
      const target = (event?.currentTarget as HTMLElement) || (event?.target as HTMLElement) || null;

      if (event?.preventDefault) {
        event.preventDefault();
      }
      if (event?.stopPropagation) {
        event.stopPropagation();
      }

      const anchorElement = resolveAnchor(target, overrides);
      anchorRef.current = anchorElement;
      calculateAndStore(anchorElement, overrides);
      setOpenState(true);
    },
    [calculateAndStore, resolveAnchor, setOpenState]
  );

  const openFromElement = React.useCallback(
    (element: HTMLElement | null, overrides?: PositionedModalConfig) => {
      anchorRef.current = element;
      calculateAndStore(element, overrides);
      setOpenState(true);
    },
    [calculateAndStore, setOpenState]
  );

  const closeModal = React.useCallback(() => {
    anchorRef.current = null;
    setOpenState(false);
  }, [setOpenState]);

  const updatePosition = React.useCallback(
    (overrides?: PositionedModalConfig) => {
      if (!currentOpen) return;
      calculateAndStore(anchorRef.current, overrides);
    },
    [calculateAndStore, currentOpen]
  );

  React.useEffect(() => {
    if (!currentOpen) return;

    if (!coordinates) {
      calculateAndStore(anchorRef.current, undefined);
    }

    const handleRecalculate = () => {
      updatePosition();
    };

    window.addEventListener("resize", handleRecalculate);
    window.addEventListener("scroll", handleRecalculate, true);

    return () => {
      window.removeEventListener("resize", handleRecalculate);
      window.removeEventListener("scroll", handleRecalculate, true);
    };
  }, [calculateAndStore, coordinates, currentOpen, updatePosition]);

  const modalStyle: React.CSSProperties | undefined = coordinates
    ? {
        top: `${coordinates.top}px`,
        left: `${coordinates.left}px`,
        width: `${coordinates.width}px`,
        maxHeight: `${coordinates.maxHeight}px`,
        overflowY: "auto",
      }
    : undefined;

  return {
    isOpen: currentOpen,
    modalStyle,
    handleOpenModal,
    openFromElement,
    closeModal,
    updatePosition,
    setOpen: setOpenState,
    anchorRef,
  };
};

export type { ModalCoordinates };
export default usePositionedModal;
