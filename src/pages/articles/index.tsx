import * as React from "react";
import { ICardProps } from "../../components/card";
import { CardContainer } from "../../components/card_container";
import {Link} from "react-router";

export interface ArticlesIndexPageProps {
    cards: ICardProps[];
}

export const ArticlesIndexPage = (props: ArticlesIndexPageProps) => {

    const cards: ICardProps[] = [];

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
