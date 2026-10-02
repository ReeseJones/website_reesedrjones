import React, { useState } from "react";
import { ArticleDetails } from "../../article_details";
import { ArticlePageLayout } from "../../article_page_layout";
import { Carousel } from "../../../../components/carousel/carousel";
import type { CarouselItem } from "../../../../components/carousel/types";
import { CarouselDialog } from "../../../../components/carousel/carousel_dialog";
import { useCarouselController } from "../../../../components/carousel/use_carousel_controller";
import { useCarouselAutoScroll } from "../../../../components/carousel/use_carousel_auto_scroll";
import RadicalFrederickMdx from "./radical-frederick.mdx";
import radicalFrederickSplashUrl from "url:../../../../images/games/radical_frederick_splash.png";

import screen01 from "url:../../../../images/frederick_screenshots/screen01.avif";
import screen02 from "url:../../../../images/frederick_screenshots/screen02.avif";
import screen03 from "url:../../../../images/frederick_screenshots/screen03.avif";
import screen04 from "url:../../../../images/frederick_screenshots/screen04.avif";
import screen05 from "url:../../../../images/frederick_screenshots/screen05.avif";
import screen06 from "url:../../../../images/frederick_screenshots/screen06.avif";

const SCREENSHOT_ITEMS: CarouselItem[] = [
    {
        title: "Gameplay Screen 1",
        fullImageUrl: screen01,
        thumbnailUrl: screen01,
        alt: "Frederick and the Pick of Fate gameplay screenshot 1",
    },
    {
        title: "Gameplay Screen 2",
        fullImageUrl: screen02,
        thumbnailUrl: screen02,
        alt: "Frederick and the Pick of Fate gameplay screenshot 2",
    },
    {
        title: "Gameplay Screen 3",
        fullImageUrl: screen03,
        thumbnailUrl: screen03,
        alt: "Frederick and the Pick of Fate gameplay screenshot 3",
    },
    {
        title: "Gameplay Screen 4",
        fullImageUrl: screen04,
        thumbnailUrl: screen04,
        alt: "Frederick and the Pick of Fate gameplay screenshot 4",
    },
    {
        title: "Gameplay Screen 5",
        fullImageUrl: screen05,
        thumbnailUrl: screen05,
        alt: "Frederick and the Pick of Fate gameplay screenshot 5",
    },
    {
        title: "Gameplay Screen 6",
        fullImageUrl: screen06,
        thumbnailUrl: screen06,
        alt: "Frederick and the Pick of Fate gameplay screenshot 6",
    },
];

export const ARTICLE_DETAILS: ArticleDetails = {
    title: "Frederick and the Pick of Fate",
    subtitle: "2D puzzle platformer",
    description: "Take control of Frederick the mole to explore expansive caverns, dig through obstacles, and redirect dynamic fluids to solve puzzles.",
    date: "2026-09-24",
    heroImageUrl: radicalFrederickSplashUrl,
    heroImageAlt: "Frederick and the Pick of Fate game splash screen",
};

export function FrederickScreenshotCarousel() {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const carouselController = useCarouselController({
        itemCount: SCREENSHOT_ITEMS.length,
    });

    const { pauseProps } = useCarouselAutoScroll({
        onAdvance: carouselController.scrollRight,
        intervalMs: 5000,
        paused: isDialogOpen,
    });

    return (
        <div
            style={{ width: "100%", maxWidth: "800px", margin: "1.5rem auto 2.5rem", boxSizing: "border-box" }}
            {...pauseProps}
        >
            <Carousel
                items={SCREENSHOT_ITEMS}
                {...carouselController.bind}
                onOpenDialog={() => setIsDialogOpen(true)}
            />
            <CarouselDialog
                items={SCREENSHOT_ITEMS}
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                {...carouselController.bind}
            />
        </div>
    );
}

export function FrederickGameplayVideo() {
    return (
        <div style={{ width: "100%", maxWidth: "800px", margin: "1.5rem auto 2.5rem", aspectRatio: "16/9" }}>
            <iframe
                src="https://www.youtube-nocookie.com/embed/EW_UfYufpvY"
                title="Frederick and the Pick of Fate Gameplay Video"
                style={{ width: "100%", height: "100%", border: 0, borderRadius: "8px" }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
            />
        </div>
    );
}

export default function RadicalFrederickArticle() {
    return (
        <ArticlePageLayout {...ARTICLE_DETAILS}>
            <RadicalFrederickMdx
                components={{
                    Carousel: FrederickScreenshotCarousel,
                    Video: FrederickGameplayVideo,
                }}
            />
        </ArticlePageLayout>
    );
}
