import "../styles.scss";
import "./main.scss";
import React, { useState } from "react";
import headshotPhotoFilename from "url:../images/headshot6.jpg?width=200";
import { Carousel } from "../components/carousel/carousel";
import type { CarouselItem } from "../components/carousel/types";
import { CarouselDialog } from "../components/carousel/carousel_dialog";
import { useCarouselController } from "../components/carousel/use_carousel_controller";
import { useCarouselAutoScroll } from "../components/carousel/use_carousel_auto_scroll";
import { Panel } from "../components/panel/panel";

import dotsSplashImg from "url:../images/games/dots_splash.png";
import guardiansOfNogardSplashImg from "url:../images/games/guardians_of_nogard_splash.png";
import projectScaleSplashImg from "url:../images/games/project_scale_splash.png";
import radicalFrederickSplashImg from "url:../images/games/radical_frederick_splash.png";
import gardenGuardiansSplashImg from "url:../images/games/garden_guardians_splash.jpg";

const CAROUSEL_ITEMS: CarouselItem[] = [
    {
        title: "Garden Guardians",
        fullImageUrl: gardenGuardiansSplashImg,
        thumbnailUrl: gardenGuardiansSplashImg,
        alt: "Garden Guardians gameplay screenshot",
        linkUrl: "/articles/games/garden-guardians",
    },
    {
        title: "D.O.T.S.",
        fullImageUrl: dotsSplashImg,
        thumbnailUrl: dotsSplashImg,
        alt: "Dots splash screen",
        linkUrl: "/articles/games/dots",
    },
    {
        title: "Guardians of Nogard",
        fullImageUrl: guardiansOfNogardSplashImg,
        thumbnailUrl: guardiansOfNogardSplashImg,
        alt: "Guardians of Nogard splash screen",
        linkUrl: "/articles/games/guardians-of-nogard",
    },
    {
        title: "Void Guardian",
        fullImageUrl: projectScaleSplashImg,
        thumbnailUrl: projectScaleSplashImg,
        alt: "Void Guardian splash screen",
        linkUrl: "/articles/games/void-guardian",
    },
    {
        title: "Radical Frederick & The Pick of Fate",
        fullImageUrl: radicalFrederickSplashImg,
        thumbnailUrl: radicalFrederickSplashImg,
        alt: "Radical Frederick splash screen",
        linkUrl: "/articles/games/radical-frederick",
    },
];

export const Main = () => {
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const carouselController = useCarouselController({
        itemCount: CAROUSEL_ITEMS.length,
    });

    const { pauseProps } = useCarouselAutoScroll({
        onAdvance: carouselController.scrollRight,
        intervalMs: 5000,
        paused: isDialogOpen,
    });

    return (
        <section className="article-body">
            <img
                src={headshotPhotoFilename}
                alt="Reese Jones head shot"
                width={200}
                height={200}
            />
            <p className="hero-title">Reese Jones</p>
            <p className="hero-body">Software Engineer, Gamer & Part-time Adventurer</p>
            <Panel
                heading="Games"
                className="carousel-container"
            >
                <Carousel
                    items={CAROUSEL_ITEMS}
                    {...carouselController.bind}
                    {...pauseProps}
                    onOpenDialog={() => setIsDialogOpen(true)}
                />
            </Panel>
            <CarouselDialog
                items={CAROUSEL_ITEMS}
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                {...carouselController.bind}
            />
        </section>
    );
};
