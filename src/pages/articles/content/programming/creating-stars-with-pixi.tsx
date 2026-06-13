import { ArticleDetails } from "../../article_details";
import { ArticlePageLayout } from "../../article_page_layout";
import CreatingStarsWithPixiMdx from "./creating-stars-with-pixi.mdx";
import ImagePath from "url:./images/pixi_star_field.png"



export const ARTICLE_DETAILS: ArticleDetails = {
    title: "Creating Stars With Pixi",
    subtitle: "",
    description: "",
    date: "2022-04-17",
    heroImageUrl: ImagePath,
    heroImageAlt: "A special effect which looks like a star cloud"
}

export default function CreatingStarsWithPixiArticle() {

    return (
        <ArticlePageLayout {...ARTICLE_DETAILS}>
            <CreatingStarsWithPixiMdx/>;
        </ArticlePageLayout>
    )
}