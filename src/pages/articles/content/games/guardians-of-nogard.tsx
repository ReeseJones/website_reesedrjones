import React from "react";
import { ArticleDetails } from "../../article_details";
import { ArticlePageLayout } from "../../article_page_layout";
import { Carousel, CarouselItem } from "../../../../components/carousel/carousel";
import { useCarouselController } from "../../../../components/carousel/use_carousel_controller";
import { useCarouselAutoScroll } from "../../../../components/carousel/use_carousel_auto_scroll";
import GuardiansOfNogardMdx from "./guardians-of-nogard.mdx";
import guardiansOfNogardSplashUrl from "url:../../../../images/games/guardians_of_nogard_splash.png";

import screen01 from "url:./images/guardians_of_nogard/screen01.avif";
import screen02 from "url:./images/guardians_of_nogard/screen02.avif";
import screen03 from "url:./images/guardians_of_nogard/screen03.avif";
import screen04 from "url:./images/guardians_of_nogard/screen04.avif";
import screen05 from "url:./images/guardians_of_nogard/screen05.avif";

const SCREENSHOT_ITEMS: CarouselItem[] = [
    {
        title: "Gameplay Screen 1",
        fullImageUrl: screen01,
        thumbnailUrl: screen01,
        alt: "Guardians of Nogard gameplay screenshot 1",
    },
    {
        title: "Gameplay Screen 2",
        fullImageUrl: screen02,
        thumbnailUrl: screen02,
        alt: "Guardians of Nogard gameplay screenshot 2",
    },
    {
        title: "Gameplay Screen 3",
        fullImageUrl: screen03,
        thumbnailUrl: screen03,
        alt: "Guardians of Nogard gameplay screenshot 3",
    },
    {
        title: "Gameplay Screen 4",
        fullImageUrl: screen04,
        thumbnailUrl: screen04,
        alt: "Guardians of Nogard gameplay screenshot 4",
    },
    {
        title: "Gameplay Screen 5",
        fullImageUrl: screen05,
        thumbnailUrl: screen05,
        alt: "Guardians of Nogard gameplay screenshot 5",
    },
];

export const ARTICLE_DETAILS: ArticleDetails = {
    title: "Guardians of Nogard",
    subtitle: "Action adventure game",
    description: "Defend the realm of Nogard in this action adventure game.",
    date: "2026-09-24",
    heroImageUrl: guardiansOfNogardSplashUrl,
    heroImageAlt: "Guardians of Nogard game splash screen",
};

export function GuardiansScreenshotCarousel() {
    const carouselController = useCarouselController({
        itemCount: SCREENSHOT_ITEMS.length,
    });

    const { pauseProps } = useCarouselAutoScroll({
        onAdvance: carouselController.scrollRight,
        intervalMs: 5000,
    });

    return (
        <div
            style={{ width: "100%", maxWidth: "800px", margin: "1.5rem auto 2.5rem", boxSizing: "border-box" }}
            {...pauseProps}
        >
            <Carousel
                items={SCREENSHOT_ITEMS}
                {...carouselController.bind}
            />
        </div>
    );
}

export default function GuardiansOfNogardArticle() {
    return (
        <ArticlePageLayout {...ARTICLE_DETAILS}>
            <GuardiansOfNogardMdx components={{ Carousel: GuardiansScreenshotCarousel }} />
        </ArticlePageLayout>
    );
}

