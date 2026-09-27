import React from "react";
import { ArticleDetails } from "../../article_details";
import { ArticlePageLayout } from "../../article_page_layout";
import { Carousel, CarouselItem } from "../../../../components/carousel/carousel";
import { useCarouselController } from "../../../../components/carousel/use_carousel_controller";
import { useCarouselAutoScroll } from "../../../../components/carousel/use_carousel_auto_scroll";
import GardenGuardiansMdx from "./garden-guardians.mdx";
import gardenGuardiansLogoUrl from "url:./images/garden_guardians/logo.png?as=webp&width=700";

import screen01 from "url:./images/garden_guardians/GardenGuardians_1_hires.jpg";
import screen02 from "url:./images/garden_guardians/GardenGuardians_2_hires.jpg";
import screen03 from "url:./images/garden_guardians/GardenGuardians_3_hires.jpg";

import princessPumpkinImg from "url:./images/garden_guardians/princess_pumpkin.png?as=webp&width=250";
import radishKnightImg from "url:./images/garden_guardians/radish_knight.png?as=webp&width=250";
import aubergineAssassinImg from "url:./images/garden_guardians/aubergine_assassin.png?as=webp&width=250";
import potatoGolemImg from "url:./images/garden_guardians/potato_golem.png?as=webp&width=250";

export const ARTICLE_DETAILS: ArticleDetails = {
    title: "Garden Guardians",
    subtitle: "3D top-down hack-n-slash adventure",
    description: "A 3D top-down hack-n-slash adventure featuring lush garden environments, vegetable heroes, and meat enemies in 1 to 4 player co-op.",
    date: "2026-09-26",
    heroImageUrl: gardenGuardiansLogoUrl,
    heroImageAlt: "Garden Guardians game logo",
};

const SCREENSHOT_ITEMS: CarouselItem[] = [
    {
        title: "His Meggnificence Boss Battle",
        fullImageUrl: screen01,
        thumbnailUrl: screen01,
        alt: "Garden Guardians boss arena battle against His Meggnificence and Sir Filet Mignonitaur",
    },
    {
        title: "Sir Angus of Istanbull Arena",
        fullImageUrl: screen02,
        thumbnailUrl: screen02,
        alt: "Garden Guardians circular wooden arena battle against Sir Angus of Istanbull",
    },
    {
        title: "Meat Menace Swarm Combat",
        fullImageUrl: screen03,
        thumbnailUrl: screen03,
        alt: "Garden Guardians vegetable heroes battling swarming meat enemies in the garden",
    },
];

const CHARACTERS = [
    {
        name: "Princess Pumpkin",
        imgUrl: princessPumpkinImg,
        alt: "Princess Pumpkin character portrait",
    },
    {
        name: "Radish Knight",
        imgUrl: radishKnightImg,
        alt: "Radish Knight character portrait",
    },
    {
        name: "Aubergine Assassin",
        imgUrl: aubergineAssassinImg,
        alt: "Aubergine Assassin character portrait",
    },
    {
        name: "Potato Golem",
        imgUrl: potatoGolemImg,
        alt: "Potato Golem character portrait",
    },
];

export function GardenScreenshotCarousel() {
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

export function GardenCharacters() {
    return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "1.5rem", margin: "1.5rem 0 2.5rem" }}>
            {CHARACTERS.map(char => (
                <div key={char.name} style={{ textAlign: "center" }}>
                    <img
                        src={char.imgUrl}
                        alt={char.alt}
                        style={{ width: "100%", maxWidth: "160px", aspectRatio: "1/1", objectFit: "contain", borderRadius: "8px" }}
                    />
                    <h3 style={{ margin: "0.5rem 0 0", fontSize: "1.1rem" }}>{char.name}</h3>
                </div>
            ))}
        </div>
    );
}

export function GardenGameplayVideo() {
    return (
        <div style={{ width: "100%", maxWidth: "800px", margin: "1.5rem auto 2.5rem", aspectRatio: "16/9" }}>
            <iframe
                src="https://www.youtube-nocookie.com/embed/VDS2tuckA8w"
                title="Garden Guardians Final Trailer"
                style={{ width: "100%", height: "100%", border: 0, borderRadius: "8px" }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
            />
        </div>
    );
}

export default function GardenGuardiansArticle() {
    return (
        <ArticlePageLayout {...ARTICLE_DETAILS}>
            <GardenGuardiansMdx
                components={{
                    Video: GardenGameplayVideo,
                    Carousel: GardenScreenshotCarousel,
                    Characters: GardenCharacters,
                }}
            />
        </ArticlePageLayout>
    );
}
