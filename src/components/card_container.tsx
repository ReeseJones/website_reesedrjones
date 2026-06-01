import React from "react";
import { Card, ICardProps } from "./card";
import "./card.scss";

export interface ICardContainerProps
    extends React.ComponentPropsWithoutRef<'div'> {
    cards: ICardProps[];
}

export const CardContainer = (props: ICardContainerProps) => {
    const { cards, ...restOfProps } = props;
    return (
        <div
            {...restOfProps}
            className={restOfProps?.className + " card-container"}
        >
            {cards.map((card) => {
                return <Card {...card} key={card.id}></Card>;
            })}
        </div>
    );
};
