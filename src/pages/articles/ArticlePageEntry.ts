import { ReactNode } from "react";
import { ArticleDetails } from "./article_details";


export interface ArticlePageEntry {
    articleComponent: () => ReactNode;
    path: string;
    details: ArticleDetails
}