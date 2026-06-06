import { useParams } from "react-router";
import { RouteParams } from "../../routing/site_params";
import { ArticleDetails } from "./article_details";
import { ARTICLES_INDEX } from "./index_instance";

export function useArticleData() {
    const {articleName} = useParams<keyof RouteParams>();

    if(!articleName) {
        throw new Error("Article doesnt exist");
    }

    const pageParams = ARTICLES_INDEX.getPageParams(articleName);

    if(!pageParams) {
        throw new Error("Page params doesnt exist");
    }

    const articleDetails: ArticleDetails = {
        ...pageParams
    };
     
    return [articleName, articleDetails] as const;
}