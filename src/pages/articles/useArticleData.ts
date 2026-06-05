import { useParams } from "react-router";
import { RouteParams } from "../../routing/site_params";
import { ArticleDetails } from "./article_details";


export function useArticleData() {
    const {articleName} = useParams<keyof RouteParams>();

    const articleDetails: ArticleDetails = {
        title: "Title",
        subtitle: "Subtitle",
        heroImageUrl: "fakeImage.png",
    };
     
    return [articleName, articleDetails] as const;
}