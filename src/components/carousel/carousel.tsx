import "./carousel.scss";

import React, { useCallback } from "react";
import { useCarouselTrack } from "./use_carousel_track";
import { useThumbnailScroll } from "./use_thumbnail_scroll";
import { useSwipeGestures } from "./use_swipe_gestures";
import { validateIndex } from "../../lib/helpers";

export interface CarouselItem {
  title: string;
  fullImageUrl: string;
  thumbnailUrl: string;
  alt?: string;
  linkUrl?: string;
  description?: string;
}

export interface CarouselProps extends React.HTMLAttributes<HTMLDivElement> {
  items: CarouselItem[];
  selectedIndex: number;
  onScrollLeft?: () => void;
  onScrollRight?: () => void;
  onSelectIndex?: (index: number) => void;
  animationDurationMs?: number; // Defaults to 400ms
}

export function Carousel({
  items,
  selectedIndex,
  onScrollLeft,
  onScrollRight,
  onSelectIndex,
  animationDurationMs = 400,
  className,
  style,
  tabIndex = 0,
  onKeyDown,
  ...rest
}: CarouselProps) {
  validateIndex(selectedIndex, items, "Carousel: selectedIndex");

  const {
    slotCount,
    getSlotItemIndex,
    currentSlot,
    isTransitioning,
    trackProps,
    recordAction,
  } = useCarouselTrack({
    items,
    selectedIndex,
    animationDurationMs,
  });

  const thumbnailsRowRef = useThumbnailScroll(selectedIndex);

  const handlePrev = useCallback(() => {
    if (items.length <= 1 || isTransitioning) return;
    recordAction("left");
    onScrollLeft?.();
  }, [items.length, isTransitioning, onScrollLeft, recordAction]);

  const handleNext = useCallback(() => {
    if (items.length <= 1 || isTransitioning) return;
    recordAction("right");
    onScrollRight?.();
  }, [items.length, isTransitioning, onScrollRight, recordAction]);

  const handleSelect = useCallback(
    (index: number) => {
      if (items.length <= 1 || isTransitioning || index === selectedIndex) return;
      recordAction("select");
      onSelectIndex?.(index);
    },
    [items.length, isTransitioning, selectedIndex, onSelectIndex, recordAction]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      handlePrev();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      handleNext();
    }
    onKeyDown?.(e);
  };

  const swipeHandlers = useSwipeGestures({
    onSwipeLeft: handleNext,
    onSwipeRight: handlePrev,
  });

  const activeItem = items && items.length > 0 ? items[selectedIndex] : undefined;
  const rootClasses = ["carousel", className].filter(Boolean).join(" ");
  const rootStyle: React.CSSProperties = {
    ...style,
    ["--carousel-duration" as any]: `${animationDurationMs}ms`,
  };

  const hasMultipleItems = items && items.length > 1;

  return (
    <div
      {...rest}
      className={rootClasses}
      style={rootStyle}
      tabIndex={tabIndex}
      onKeyDown={handleKeyDown}
      role={rest.role ?? "region"}
      aria-roledescription="carousel"
      aria-label={rest["aria-label"] ?? "Image Carousel"}
    >
      <div className="title-row">
        <p>{activeItem?.title ?? ""}</p>
      </div>

      <div className="stage-row">
        <button
          type="button"
          className="arrow prev"
          onClick={handlePrev}
          aria-label="Previous slide"
          disabled={items.length <= 1 || !onScrollLeft}
        >
          ❮
        </button>

        <div className="viewport" {...swipeHandlers} aria-live="polite">
          <div {...trackProps}>
            {Array.from({ length: slotCount }, (_, slotIndex) => {
              const itemIndex = getSlotItemIndex(slotIndex);
              const item = items[itemIndex];
              if (!item) return null;

              const isClone =
                hasMultipleItems &&
                (slotIndex === 0 || slotIndex === slotCount - 1);
              const isActive = slotIndex === currentSlot;
              const displayIndex = hasMultipleItems
                ? slotIndex
                : slotIndex + 1;

              return (
                <div
                  key={`slide-${slotIndex}`}
                  className={`slide ${isActive ? "active" : ""}`.trim()}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={
                    isClone
                      ? undefined
                      : `${displayIndex} of ${items.length}`
                  }
                  aria-hidden={isClone ? "true" : undefined}
                >
                  <img src={item.fullImageUrl} alt={item.alt ?? item.title} />
                </div>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          className="arrow next"
          onClick={handleNext}
          aria-label="Next slide"
          disabled={items.length <= 1 || !onScrollRight}
        >
          ❯
        </button>
      </div>

      <div className="thumbnails-row" ref={thumbnailsRowRef} role="tablist">
        {items.map((item, index) => (
          <button
            key={index}
            type="button"
            className={index === selectedIndex ? "active" : undefined}
            onClick={() => handleSelect(index)}
            aria-label={`Go to slide ${index + 1}: ${item.title}`}
            aria-current={index === selectedIndex ? "true" : undefined}
          >
            <img src={item.thumbnailUrl} alt={item.alt ?? item.title} />
          </button>
        ))}
      </div>
    </div>
  );
}

export default Carousel;
