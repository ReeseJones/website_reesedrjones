import React, { useState } from "react";
import { ArticleDetails } from "../../article_details";
import { ArticlePageLayout } from "../../article_page_layout";
import { Carousel, CarouselItem } from "../../../../components/carousel/carousel";
import { CarouselDialog } from "../../../../components/carousel/carousel_dialog";
import { useCarouselController } from "../../../../components/carousel/use_carousel_controller";
import { useCarouselAutoScroll } from "../../../../components/carousel/use_carousel_auto_scroll";
import DotsMdx from "./dots.mdx";
import dotsSplashUrl from "url:../../../../images/games/dots_splash.png";

import screen01 from "url:./images/dots/screen01.avif";
import screen02 from "url:./images/dots/screen02.avif";
import screen03 from "url:./images/dots/screen03.avif";
import screen04 from "url:./images/dots/screen04.avif";
import screen05 from "url:./images/dots/screen05.avif";
import screen06 from "url:./images/dots/screen06.avif";

const SCREENSHOT_ITEMS: CarouselItem[] = [
    {
        title: "Gameplay Screen 1",
        fullImageUrl: screen01,
        thumbnailUrl: screen01,
        alt: "D.O.T.S. gameplay screenshot 1",
    },
    {
        title: "Gameplay Screen 2",
        fullImageUrl: screen02,
        thumbnailUrl: screen02,
        alt: "D.O.T.S. gameplay screenshot 2",
    },
    {
        title: "Gameplay Screen 3",
        fullImageUrl: screen03,
        thumbnailUrl: screen03,
        alt: "D.O.T.S. gameplay screenshot 3",
    },
    {
        title: "Gameplay Screen 4",
        fullImageUrl: screen04,
        thumbnailUrl: screen04,
        alt: "D.O.T.S. gameplay screenshot 4",
    },
    {
        title: "Gameplay Screen 5",
        fullImageUrl: screen05,
        thumbnailUrl: screen05,
        alt: "D.O.T.S. gameplay screenshot 5",
    },
    {
        title: "Gameplay Screen 6",
        fullImageUrl: screen06,
        thumbnailUrl: screen06,
        alt: "D.O.T.S. gameplay screenshot 6",
    },
];

export const ARTICLE_DETAILS: ArticleDetails = {
    title: "D.O.T.S.",
    subtitle: "Top-down space shooter",
    description: "A top-down space shooter where you collect crystal dots from asteroids to form a swarm that serves as your ammunition, shield, and thrusters.",
    date: "2026-09-24",
    heroImageUrl: dotsSplashUrl,
    heroImageAlt: "D.O.T.S. game splash screen",
};

export function DotsScreenshotCarousel() {
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

export default function DotsArticle() {
    return (
        <ArticlePageLayout {...ARTICLE_DETAILS}>
            <DotsMdx components={{ Carousel: DotsScreenshotCarousel }} />
        </ArticlePageLayout>
    );
}
