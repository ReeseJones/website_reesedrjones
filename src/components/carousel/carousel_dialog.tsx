import "./carousel_dialog.scss";

import React, { useEffect, useRef } from "react";
import type { CarouselItem, CarouselDialogProps } from "./types";
import { useSwipeGestures } from "./use_swipe_gestures";
import { validateIndex } from "../../lib/helpers";
import { CloseIcon, ChevronLeftIcon, ChevronRightIcon } from "./carousel_icons";

export function CarouselDialog({
  items,
  selectedIndex,
  isOpen,
  onClose,
  onScrollLeft,
  onScrollRight,
  onSelectIndex,
  animationDurationMs,
  className,
  style,
  onClick,
  onKeyDown,
  ...rest
}: CarouselDialogProps) {
  validateIndex(selectedIndex, items, "CarouselDialog: selectedIndex");

  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }

    return () => {
      if (dialog.open) {
        dialog.close();
      }
    };
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDialogElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      onScrollLeft?.();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      onScrollRight?.();
    }
    onKeyDown?.(e);
  };

  const handleCancel = (e: React.SyntheticEvent<HTMLDialogElement, Event>) => {
    e.preventDefault();
    onClose();
  };

  const handleClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) {
      onClose();
    }
    onClick?.(e);
  };

  const swipeHandlers = useSwipeGestures({
    onSwipeLeft: onScrollRight,
    onSwipeRight: onScrollLeft,
  });

  const activeItem = items && items.length > 0 ? items[selectedIndex] : undefined;
  const rootClasses = ["carousel-dialog", className].filter(Boolean).join(" ");
  const rootStyle: React.CSSProperties = {
    ...style,
    ...(animationDurationMs != null
      ? { ["--carousel-duration" as `--${string}`]: `${animationDurationMs}ms` }
      : {}),
  };

  return (
    <dialog
      {...rest}
      ref={dialogRef}
      className={rootClasses}
      style={rootStyle}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onCancel={handleCancel}
    >
      <button
        type="button"
        className="close-btn"
        onClick={onClose}
        aria-label="Close image viewer"
      >
        <CloseIcon />
      </button>

      <div className="caption-banner">
        <p>{activeItem?.title ?? ""}</p>
        {items.length > 0 && (
          <span className="counter">
            {selectedIndex + 1} of {items.length}
          </span>
        )}
      </div>

      <div className="stage" {...swipeHandlers}>
        {activeItem && (
          <img
            src={activeItem.fullImageUrl}
            alt={activeItem.alt ?? activeItem.title}
            className="active-image"
          />
        )}

        <button
          type="button"
          className="arrow prev"
          onClick={onScrollLeft}
          aria-label="Previous slide"
          disabled={items.length <= 1 || !onScrollLeft}
        >
          <ChevronLeftIcon />
        </button>

        <button
          type="button"
          className="arrow next"
          onClick={onScrollRight}
          aria-label="Next slide"
          disabled={items.length <= 1 || !onScrollRight}
        >
          <ChevronRightIcon />
        </button>
      </div>
    </dialog>
  );
}

export default CarouselDialog;
