import React, { useState } from "react";
import { ArticleDetails } from "../../article_details";
import { ArticlePageLayout } from "../../article_page_layout";
import { Carousel } from "../../../../components/carousel/carousel";
import type { CarouselItem } from "../../../../components/carousel/types";
import { CarouselDialog } from "../../../../components/carousel/carousel_dialog";
import { useCarouselController } from "../../../../components/carousel/use_carousel_controller";
import { useCarouselAutoScroll } from "../../../../components/carousel/use_carousel_auto_scroll";
import VoidGuardianMdx from "./void-guardian.mdx";
import voidGuardianSplashUrl from "url:../../../../images/games/project_scale_splash.png";

import screen01 from "url:./images/void_guardians/screen01.avif";
import screen02 from "url:./images/void_guardians/screen02.avif";
import screen03 from "url:./images/void_guardians/screen03.avif";
import screen04 from "url:./images/void_guardians/screen04.avif";
import screen05 from "url:./images/void_guardians/screen05.avif";
import screen06 from "url:./images/void_guardians/screen06.avif";
import screen07 from "url:./images/void_guardians/screen07.avif";
import screen08 from "url:./images/void_guardians/screen08.avif";
import screen09 from "url:./images/void_guardians/screen09.avif";
import screen10 from "url:./images/void_guardians/screen10.avif";
import screen11 from "url:./images/void_guardians/screen11.avif";
import screen12 from "url:./images/void_guardians/screen12.avif";

const SCREENSHOT_ITEMS: CarouselItem[] = [
    {
        title: "Gameplay Screen 1",
        fullImageUrl: screen01,
        thumbnailUrl: screen01,
        alt: "Void Guardian gameplay screenshot 1",
    },
    {
        title: "Gameplay Screen 2",
        fullImageUrl: screen02,
        thumbnailUrl: screen02,
        alt: "Void Guardian gameplay screenshot 2",
    },
    {
        title: "Gameplay Screen 3",
        fullImageUrl: screen03,
        thumbnailUrl: screen03,
        alt: "Void Guardian gameplay screenshot 3",
    },
    {
        title: "Gameplay Screen 4",
        fullImageUrl: screen04,
        thumbnailUrl: screen04,
        alt: "Void Guardian gameplay screenshot 4",
    },
    {
        title: "Level Select Screen",
        fullImageUrl: screen05,
        thumbnailUrl: screen05,
        alt: "Void Guardian level select screen",
    },
    {
        title: "Gameplay Screen 6",
        fullImageUrl: screen06,
        thumbnailUrl: screen06,
        alt: "Void Guardian gameplay screenshot 6",
    },
    {
        title: "Gameplay Screen 7",
        fullImageUrl: screen07,
        thumbnailUrl: screen07,
        alt: "Void Guardian gameplay screenshot 7",
    },
    {
        title: "Coleopods Enemy Concept",
        fullImageUrl: screen08,
        thumbnailUrl: screen08,
        alt: "Void Guardian Coleopods beetle bomber enemy concept art by Delaney Kohler",
    },
    {
        title: "Scolopods Enemy Concept",
        fullImageUrl: screen09,
        thumbnailUrl: screen09,
        alt: "Void Guardian Scolopods suicide unit enemy concept art",
    },
    {
        title: "Space Station Model",
        fullImageUrl: screen10,
        thumbnailUrl: screen10,
        alt: "Void Guardian 3D space station model render",
    },
    {
        title: "Enemy Concepts Exploration",
        fullImageUrl: screen11,
        thumbnailUrl: screen11,
        alt: "Void Guardian enemy design concept sketches",
    },
    {
        title: "Asteroid Field Concept",
        fullImageUrl: screen12,
        thumbnailUrl: screen12,
        alt: "Void Guardian crystal asteroids environment concept art",
    },
];

export const ARTICLE_DETAILS: ArticleDetails = {
    title: "Void Guardian",
    subtitle: "3rd-person space dog fighting game",
    description: "Defend your base from waves of enemy ships in this 3rd-person space dogfighting game built in Unity.",
    date: "2026-09-24",
    heroImageUrl: voidGuardianSplashUrl,
    heroImageAlt: "Void Guardian game splash screen",
};

export function VoidGameplayVideo() {
    return (
        <div style={{ width: "100%", maxWidth: "800px", margin: "1.5rem auto 2.5rem", aspectRatio: "16/9" }}>
            <iframe
                src="https://www.youtube-nocookie.com/embed/05mnhJ6tuRU"
                title="Void Guardian Gameplay Video"
                style={{ width: "100%", height: "100%", border: 0, borderRadius: "8px" }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
            />
        </div>
    );
}

export function VoidScreenshotCarousel() {
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

export default function VoidGuardianArticle() {
    return (
        <ArticlePageLayout {...ARTICLE_DETAILS}>
            <VoidGuardianMdx
                components={{
                    Video: VoidGameplayVideo,
                    Carousel: VoidScreenshotCarousel,
                }}
            />
        </ArticlePageLayout>
    );
}
