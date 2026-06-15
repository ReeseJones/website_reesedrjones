import { ArticleDetails } from "../../article_details";
import { ArticlePageLayout } from "../../article_page_layout";
import MyDogScottyMdx from "./my-dog-scotty.mdx";
import ScottyPuppyFilePath from "url:./images/scotty_puppy_01.jpg?width=400";


export const ARTICLE_DETAILS: ArticleDetails = {
    title: "My Dog Scotty",
    subtitle: "",
    description: "",
    date: "2022-03-01",
    heroImageUrl: ScottyPuppyFilePath,
    heroImageAlt: "A picture of Scotty the Chihuahua",
}

export default function MyDogScottyArticle() {

    return (
        <ArticlePageLayout {...ARTICLE_DETAILS}>
            <MyDogScottyMdx/>
        </ArticlePageLayout>
    )
}