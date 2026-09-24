import { ArticleDetails } from "../../article_details";
import { ArticlePageLayout } from "../../article_page_layout";
import DotsMdx from "./dots.mdx";
import dotsSplashUrl from "url:../../../../images/games/dots_splash.png";

export const ARTICLE_DETAILS: ArticleDetails = {
    title: "Dots",
    subtitle: "A minimalist puzzle game",
    description: "An overview of Dots, focusing on mechanics and gameplay.",
    date: "2026-09-24",
    heroImageUrl: dotsSplashUrl,
    heroImageAlt: "Dots game splash screen",
};

export default function DotsArticle() {
    return (
        <ArticlePageLayout {...ARTICLE_DETAILS}>
            <DotsMdx />
        </ArticlePageLayout>
    );
}
