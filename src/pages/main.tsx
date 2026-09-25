import "../styles.scss";
import "./main.scss";
import React from "react";
import headshotPhotoFilename from "url:../images/headshot6.jpg?width=200";
import { Carousel, CarouselItem } from "../components/carousel/carousel";
import { useCarouselController } from "../components/carousel/use_carousel_controller";
import { useCarouselAutoScroll } from "../components/carousel/use_carousel_auto_scroll";

import dotsSplashImg from "url:../images/games/dots_splash.png";
import guardiansOfNogardSplashImg from "url:../images/games/guardians_of_nogard_splash.png";
import projectScaleSplashImg from "url:../images/games/project_scale_splash.png";
import radicalFrederickSplashImg from "url:../images/games/radical_frederick_splash.png";

const CAROUSEL_ITEMS: CarouselItem[] = [
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
        title: "Project Scale",
        fullImageUrl: projectScaleSplashImg,
        thumbnailUrl: projectScaleSplashImg,
        alt: "Project Scale splash screen",
        linkUrl: "/articles/games/project-scale",
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
    const carouselController = useCarouselController({
        itemCount: CAROUSEL_ITEMS.length,
    });

    const { pauseProps } = useCarouselAutoScroll({
        onAdvance: carouselController.scrollRight,
        intervalMs: 5000,
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
            <div className="carousel-container" {...pauseProps}>
                <Carousel
                    items={CAROUSEL_ITEMS}
                    {...carouselController.bind}
                />
            </div>
        </section>
    );
};
