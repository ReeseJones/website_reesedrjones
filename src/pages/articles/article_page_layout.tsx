import * as React from "react";
import "./article.scss";

export interface IArticlePageProps {
    title?: string;
    subtitle?: string;
    children?: React.ReactNode;
    heroImageUrl?: string;
}

export const ArticlePageLayout = (props: IArticlePageProps) => {
    const {title, subtitle, children, heroImageUrl} = props;

    return (
        <article className="page-content blog-article">
            <div className="grid">
                <div className="col col-12">
                    <h1>{title}</h1>
                    <p>{subtitle}</p>
                </div>
                <div className="col col-12 justify-center">
                    {heroImageUrl && <img
                        className="hero-image"
                        src={heroImageUrl}
                    />}
                </div>
                <div className="col col-12">
                    {children}
                </div>
            </div>
        </article>
    );
};
