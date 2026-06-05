import * as React from "react";
import "./article.scss";
import { ArticlePageLayout } from "./article_page_layout";
import { useArticleData } from "./useArticleData";


export const ArticlePage = () => {
    const [articleName, articleDetails] = useArticleData();

    return <ArticlePageLayout {...articleDetails}>
        {articleDetails.children}
    </ArticlePageLayout>
};
