import { useEffect, useRef } from "react";

/**
 * Automatically scrolls the active thumbnail button inside the thumbnails row into view
 * whenever the selected index changes.
 *
 * @param selectedIndex - The currently active slide index
 * @returns A ref to attach to the thumbnails row container element
 */
export function useThumbnailScroll(
  selectedIndex: number
): React.RefObject<HTMLDivElement | null> {
  const thumbnailsRowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!thumbnailsRowRef.current) return;

    const activeThumbnail = thumbnailsRowRef.current.querySelector(
      "button.active"
    ) as HTMLElement | null;

    if (activeThumbnail) {
      activeThumbnail.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
    }
  }, [selectedIndex]);

  return thumbnailsRowRef;
}
