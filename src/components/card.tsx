import React, { JSXElementConstructor, ReactElement, ReactNode } from "react";
import "./card.scss";
export interface ICardProps {
    id: string;
    title: string;
    children?: React.ReactNode;
}

export const Card: React.FC<ICardProps> = (props) => {


    return (
        <section className="card" key={props.id}>
            <div className="card-content">
                <h2 className="card-title">{props.title} </h2>
                <section className="card-details">{props.children}</section>
            </div>
        </section>
    );
};
