import { ArticleDetails } from "../../article_details";
import { ArticlePageLayout } from "../../article_page_layout";
import HalloweenClimbMdx from "./halloween-climb.mdx";

export const ARTICLE_DETAILS: ArticleDetails = {
    title: "Stone Gardens Halloween Climb",
    subtitle: "",
    description: "",
    date: "2022-04-17",
    heroImageUrl: "",
    heroImageAlt: ""
}

export default function CreatingStarsWithPixiArticle() {

    return (
        <ArticlePageLayout {...ARTICLE_DETAILS}>
            <HalloweenClimbMdx/>;
        </ArticlePageLayout>
    )
}