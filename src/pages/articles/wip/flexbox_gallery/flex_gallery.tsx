import { ArticleDetails } from "../../article_details";
import { ArticlePageLayout } from "../../article_page_layout";
import ImagePath from "url:./hero_image.jpg";


export const ARTICLE_DETAILS: ArticleDetails = {
    title: "Image Gallery with Flexbox",
    subtitle: "",
    description: "",
    date: "2022-04-17",
    heroImageUrl: ImagePath,
    heroImageAlt: "Abstract image"
}

export default function FlexGalleryArticle() {

    return (
        <ArticlePageLayout {...ARTICLE_DETAILS}>
            <p>To make a flexbox gallery make a container like this</p>
            <p>
                Then to get images to dynamically size to fit the container
                add this class to them so that they keep their aspect ratio
                but also expand to fit the row its on.
            </p>
            <p>
                Now images will resize dynamically to fit in the gallery!
            </p>
        </ArticlePageLayout>
    )
}