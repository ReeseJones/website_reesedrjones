import React from "react";
import { ArticleDetails } from "../../article_details";
import { ArticlePageLayout } from "../../article_page_layout";
import GardenGuardiansMdx from "./garden-guardians.mdx";
import gardenGuardiansLogoUrl from "url:./images/garden_guardians/logo.png?as=webp&width=700";

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
                    Characters: GardenCharacters,
                }}
            />
        </ArticlePageLayout>
    );
}
