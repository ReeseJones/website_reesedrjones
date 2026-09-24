import "../styles.scss";
import React, { useState } from "react";
import headshotPhotoFilename from "url:../images/headshot6.jpg?width=200";
import { Carousel, CarouselItem } from "../components/carousel/carousel";
import { useCarouselController } from "../components/carousel/use_carousel_controller";
import { useCarouselAutoScroll } from "../components/carousel/use_carousel_auto_scroll";

import campfireImg from "url:../images/about-me-gallery/campfire.jpg";
import droneImg from "url:../images/about-me-gallery/drone_picture.jpg";
import boulderingImg from "url:../images/about-me-gallery/bouldering_hike.jpg";
import snowboardingImg from "url:../images/about-me-gallery/snowboarding_stevens_pass_2022.jpg";
import paddleBoardingImg from "url:../images/about-me-gallery/paddle_boarding.jpg";

const TEST_CAROUSEL_ITEMS: CarouselItem[] = [
    {
        title: "Campfire by the Lake",
        fullImageUrl: campfireImg,
        thumbnailUrl: campfireImg,
        alt: "Warm campfire glowing by the lake at night",
    },
    {
        title: "Aerial Drone Photography",
        fullImageUrl: droneImg,
        thumbnailUrl: droneImg,
        alt: "Aerial landscape captured by drone",
    },
    {
        title: "Red Rock Bouldering Hike",
        fullImageUrl: boulderingImg,
        thumbnailUrl: boulderingImg,
        alt: "Scenic bouldering hike across red rock canyons",
    },
    {
        title: "Snowboarding Stevens Pass",
        fullImageUrl: snowboardingImg,
        thumbnailUrl: snowboardingImg,
        alt: "Snowboarding down powder trails at Stevens Pass",
    },
    {
        title: "Summer Paddle Boarding",
        fullImageUrl: paddleBoardingImg,
        thumbnailUrl: paddleBoardingImg,
        alt: "Paddle boarding on calm open waters during summer",
    },
];

export const Main = () => {
    const [isPaused, setIsPaused] = useState(false);

    const carouselController = useCarouselController({
        itemCount: TEST_CAROUSEL_ITEMS.length,
    });

    useCarouselAutoScroll({
        onAdvance: carouselController.scrollRight,
        intervalMs: 5000,
        paused: isPaused,
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
            <div
                style={{ width: "100%", maxWidth: "800px", padding: "0 1rem 4rem", boxSizing: "border-box" }}
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
                onFocus={() => setIsPaused(true)}
                onBlur={() => setIsPaused(false)}
            >
                <Carousel
                    items={TEST_CAROUSEL_ITEMS}
                    {...carouselController.bind}
                />
            </div>
        </section>
    );
};
