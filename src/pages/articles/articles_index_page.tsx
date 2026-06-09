import * as React from "react";
import { ICardProps } from "../../components/card";
import { CardContainer } from "../../components/card_container";
import {Link} from "react-router";
import { ARTICLES_INDEX } from "./index_instance";

export interface ArticlesIndexPageProps {
    cards: ICardProps[];
}

export const ArticlesIndexPage = () => {

    const cards: ICardProps[] = ARTICLES_INDEX.getAllPages().map((page) => {
        return {
            id: page.title,
            ...page
        }
    });

    return (
        <div className="page-content grid">
            <div className="col col-12">
                <h1>Articles</h1>
            </div>
            <div className="col col-12">
                <CardContainer cards={cards} />
            </div>
        </div>
    );
};
