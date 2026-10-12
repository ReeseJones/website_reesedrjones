import React from "react";

export type CarouselImageMode = "fit" | "cover";

export interface CarouselItem {
  title: string;
  fullImageUrl: string;
  thumbnailUrl: string;
  alt?: string;
  linkUrl?: string;
  description?: string;
  imageMode?: CarouselImageMode;
}

export interface CarouselProps extends React.HTMLAttributes<HTMLDivElement> {
  items: CarouselItem[];
  selectedIndex: number;
  onScrollLeft?: () => void;
  onScrollRight?: () => void;
  onSelectIndex?: (index: number) => void;
  onOpenDialog?: (index: number) => void;
  animationDurationMs?: number; // Defaults to 400ms
  imageMode?: CarouselImageMode; // Defaults to "fit"
}

export interface RenderSlideContentOptions {
  item: CarouselItem;
  isSelected: boolean;
  selectedIndex: number;
  isTransitioning: boolean;
  onOpenDialog?: (index: number) => void;
}

export interface CarouselDialogProps
  extends React.HTMLAttributes<HTMLDialogElement> {
  items: CarouselItem[];
  selectedIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onScrollLeft?: () => void;
  onScrollRight?: () => void;
  onSelectIndex?: (index: number) => void;
  animationDurationMs?: number;
}

export interface CarouselPauseProps {
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onFocus: () => void;
  onBlur: (e: React.FocusEvent<HTMLElement>) => void;
}

export interface UseCarouselAutoScrollOptions {
  onAdvance: () => void;
  intervalMs?: number;
  paused?: boolean;
}

export interface UseCarouselAutoScrollReturn {
  isPaused: boolean;
  pause: () => void;
  resume: () => void;
  pauseProps: CarouselPauseProps;
}

export interface UseCarouselControllerOptions {
  itemCount: number;
  initialIndex?: number;
  loop?: boolean;
}

export interface CarouselControllerBind {
  selectedIndex: number;
  onScrollLeft: () => void;
  onScrollRight: () => void;
  onSelectIndex: (index: number) => void;
}

export interface UseCarouselControllerReturn {
  selectedIndex: number;
  setIndex: (index: number) => void;
  scrollLeft: () => void;
  scrollRight: () => void;
  bind: CarouselControllerBind;
}

export interface UseCarouselTrackOptions {
  items: CarouselItem[];
  selectedIndex: number;
  animationDurationMs?: number;
}

export interface UseCarouselTrackReturn {
  slotCount: number;
  getSlotItemIndex: (slotIndex: number) => number;
  currentSlot: number;
  isTransitioning: boolean;
  isSilentSnap: boolean;
  trackProps: {
    ref: React.RefObject<HTMLDivElement | null>;
    className: string;
    style: React.CSSProperties;
    onTransitionEnd: (e: React.TransitionEvent<HTMLDivElement>) => void;
  };
  recordAction: (action: "left" | "right" | "select") => void;
}

export interface UseSwipeGesturesOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  minDistance?: number; // default: 50px
}

export interface SwipeGestureHandlers {
  onTouchStart: (e: React.TouchEvent<HTMLElement>) => void;
  onTouchMove: (e: React.TouchEvent<HTMLElement>) => void;
  onTouchEnd: () => void;
  onTouchCancel: () => void;
}
