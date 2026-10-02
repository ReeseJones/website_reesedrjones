import "./carousel.scss";

import React, { useCallback } from "react";
import { Link } from "react-router-dom";
import { useCarouselTrack } from "./use_carousel_track";
import { useContainedScroll } from "../../hooks/use_contained_scroll";
import { useSwipeGestures } from "./use_swipe_gestures";
import { validateIndex } from "../../lib/helpers";
import { FullscreenIcon, ChevronLeftIcon, ChevronRightIcon } from "./carousel_icons";

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

interface RenderSlideContentOptions {
  item: CarouselItem;
  isSelected: boolean;
  selectedIndex: number;
  isTransitioning: boolean;
  onOpenDialog?: (index: number) => void;
}

function renderSlideImage(item: CarouselItem): React.ReactElement {
  return <img src={item.fullImageUrl} alt={item.alt ?? item.title} />;
}

function renderExternalLinkSlide(
  item: CarouselItem,
  image: React.ReactElement,
  isTransitioning: boolean
): React.ReactElement {
  return (
    <a
      href={item.linkUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => {
        if (isTransitioning) e.preventDefault();
      }}
    >
      {image}
    </a>
  );
}

function renderInternalLinkSlide(
  item: CarouselItem,
  image: React.ReactElement,
  isTransitioning: boolean
): React.ReactElement {
  return (
    <Link
      to={item.linkUrl!}
      onClick={(e) => {
        if (isTransitioning) e.preventDefault();
      }}
    >
      {image}
    </Link>
  );
}

function renderDialogButtonSlide(
  item: CarouselItem,
  image: React.ReactElement,
  selectedIndex: number,
  onOpenDialog: (index: number) => void,
  isTransitioning: boolean
): React.ReactElement {
  return (
    <button
      type="button"
      onClick={() => {
        if (!isTransitioning) {
          onOpenDialog(selectedIndex);
        }
      }}
      aria-label={`Open fullscreen view: ${item.title}`}
    >
      {image}
    </button>
  );
}

function renderSlideContent({
  item,
  isSelected,
  selectedIndex,
  isTransitioning,
  onOpenDialog,
}: RenderSlideContentOptions): React.ReactElement {
  const image = renderSlideImage(item);

  if (!isSelected) {
    return image;
  }

  if (item.linkUrl) {
    const isExternal = /^(https?:)?\/\//.test(item.linkUrl);
    if (isExternal) {
      return renderExternalLinkSlide(item, image, isTransitioning);
    }
    return renderInternalLinkSlide(item, image, isTransitioning);
  }

  if (onOpenDialog) {
    return renderDialogButtonSlide(
      item,
      image,
      selectedIndex,
      onOpenDialog,
      isTransitioning
    );
  }

  return image;
}

export function Carousel({
  items,
  selectedIndex,
  onScrollLeft,
  onScrollRight,
  onSelectIndex,
  onOpenDialog,
  animationDurationMs = 400,
  imageMode = "fit",
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

  const thumbnailsRowRef = useContainedScroll<HTMLDivElement>({
    activeSelector: "button.active",
    trigger: selectedIndex,
    axis: "x",
    alignment: "nearest",
  });

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
    ["--carousel-duration" as `--${string}`]: `${animationDurationMs}ms`,
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
        {activeItem?.linkUrl ? (
          <p>
            {/^(https?:)?\/\//.test(activeItem.linkUrl) ? (
              <a href={activeItem.linkUrl} target="_blank" rel="noopener noreferrer">
                {activeItem.title}
              </a>
            ) : (
              <Link to={activeItem.linkUrl}>
                {activeItem.title}
              </Link>
            )}
          </p>
        ) : (
          <p>{activeItem?.title ?? ""}</p>
        )}
      </div>

      <div className="stage-row">
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
              const isSelected = !isClone && itemIndex === selectedIndex;
              const displayIndex = hasMultipleItems
                ? slotIndex
                : slotIndex + 1;

              const slideContent = renderSlideContent({
                item,
                isSelected,
                selectedIndex,
                isTransitioning,
                onOpenDialog,
              });

              const effectiveImageMode = item.imageMode ?? imageMode;
              const isCover = effectiveImageMode === "cover";
              const isFit = effectiveImageMode === "fit";

              return (
                <div
                  key={`slide-${slotIndex}`}
                  className={`slide ${isActive ? "active" : ""} ${isCover ? "cover" : ""} ${isFit ? "fit" : ""}`.trim()}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={
                    isClone
                      ? undefined
                      : `${displayIndex} of ${items.length}`
                  }
                  aria-hidden={isClone ? "true" : undefined}
                >
                  {slideContent}
                </div>
              );
            })}
          </div>
        </div>

        {onOpenDialog && items.length > 0 && (
          <button
            type="button"
            className="expand-btn"
            onClick={() => onOpenDialog(selectedIndex)}
            aria-label="Open fullscreen image viewer"
          >
            <FullscreenIcon />
          </button>
        )}

        <button
          className="arrow prev"
          onClick={handlePrev}
          aria-label="Previous slide"
          disabled={items.length <= 1 || !onScrollLeft}
        >
          <ChevronLeftIcon />
        </button>

        <button
          className="arrow next"
          onClick={handleNext}
          aria-label="Next slide"
          disabled={items.length <= 1 || !onScrollRight}
        >
          <ChevronRightIcon />
        </button>
      </div>

      <div className="thumbnails-row" ref={thumbnailsRowRef} role="tablist">
        {items.map((item, index) => (
          <button
            key={index}
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
