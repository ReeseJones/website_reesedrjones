import { ArticleDetails } from "../../article_details";
import { ArticlePageLayout } from "../../article_page_layout";
import RedRockCanyonMdx from "./red-rock-canyon.mdx";

export const ARTICLE_DETAILS: ArticleDetails = {
    title: "Red Rock Canyon",
    subtitle: "",
    description: "",
    date: "2022-04-17",
    heroImageUrl: "",
    heroImageAlt: "Climbing trip to red rock canyon"
}

export default function CreatingStarsWithPixiArticle() {

    return (
        <ArticlePageLayout {...ARTICLE_DETAILS}>
            <RedRockCanyonMdx/>;
        </ArticlePageLayout>
    )
}