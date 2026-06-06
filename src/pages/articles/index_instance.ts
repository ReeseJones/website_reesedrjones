import { ArticleDetails } from "./article_details";
import { PageIndex } from "./articles_index";

export const ARTICLES_INDEX = new PageIndex<ArticleDetails>();

export function Register(name: string, params: ArticleDetails) {
    return ARTICLES_INDEX.registerPage(name, params);
}