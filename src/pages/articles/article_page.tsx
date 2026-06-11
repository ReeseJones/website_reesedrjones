import * as React from "react";
import "./article.scss";

import { ArticlePageLayout } from "./article_page_layout";
import { useArticleData } from "./useArticleData";


export const ArticlePage = () => {
    const [articleName, articleDetails] = useArticleData();

    const {children, ...restDetails} = articleDetails;
    
    return <ArticlePageLayout {...restDetails}>
        {children}
    </ArticlePageLayout>
};
