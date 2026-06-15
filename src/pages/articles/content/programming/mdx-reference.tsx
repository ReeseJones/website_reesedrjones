import { ArticleDetails } from "../../article_details";
import { ArticlePageLayout } from "../../article_page_layout";
import MdxContent from "./mdx-reference.mdx";
import HeroImageFilepath from "url:/src/pages/articles/shared/images/code_header.jpg?width=400";


export const ARTICLE_DETAILS: ArticleDetails = {
    title: "Mdx Reference Page",
    subtitle: "Showcase possible mdx for reference and testing",
    description: "An article page showcasing features of markdown to help me test my rendering and also be a reference for what I can use when making a markdown file.",
    date: "2026-06-15",
    heroImageUrl: HeroImageFilepath,
    heroImageAlt: "",
}

export default function MyDogScottyArticle() {

    return (
        <ArticlePageLayout {...ARTICLE_DETAILS}>
            <MdxContent/>
        </ArticlePageLayout>
    )
}