import { ArticleDetails } from "../../article_details";
import { ArticlePageLayout } from "../../article_page_layout";
import BuildingABedMdx from "./building-a-bed.mdx";


export const ARTICLE_DETAILS: ArticleDetails = {
    title: "Build-a-bed Workshop",
    subtitle: "Planning and building a bed frame",
    date: "2020-10-31",
    description: "Planning the construction of a bed frame!",
    heroImageUrl: "",
    heroImageAlt: "Picture of an assembled wooden bedframe"
}

export default function BuildingABed() {

    return (
        <ArticlePageLayout {...ARTICLE_DETAILS}>
            <BuildingABedMdx/>;
        </ArticlePageLayout>
    )
}