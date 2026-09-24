import { ArticleDetails } from "../../article_details";
import { ArticlePageLayout } from "../../article_page_layout";
import RadicalFrederickMdx from "./radical-frederick.mdx";
import radicalFrederickSplashUrl from "url:../../../../images/games/radical_frederick_splash.png";

export const ARTICLE_DETAILS: ArticleDetails = {
    title: "Radical Frederick",
    subtitle: "Retro arcade adventure",
    description: "An energetic retro arcade adventure starring Frederick.",
    date: "2026-09-24",
    heroImageUrl: radicalFrederickSplashUrl,
    heroImageAlt: "Radical Frederick game splash screen",
};

export default function RadicalFrederickArticle() {
    return (
        <ArticlePageLayout {...ARTICLE_DETAILS}>
            <RadicalFrederickMdx />
        </ArticlePageLayout>
    );
}
