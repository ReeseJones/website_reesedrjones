import React, { JSXElementConstructor, ReactElement } from "react";
import "./card.scss";
export interface ICardProps {
    id: string;
    title: ReactElement<any, string | JSXElementConstructor<any>>;
    backgroundElement?: ReactElement<any, string | JSXElementConstructor<any>>;
    children?: React.ReactNode;
}

export const Card: React.FC<ICardProps> = (props) => {
    const bgEl = props.backgroundElement
        ? React.cloneElement(props.backgroundElement, {
              className: "card-background"
          })
        : null;

    return (
        <section className="card" key={props.id}>
            {bgEl}
            <div className="card-content">
                {React.cloneElement(props.title, { className: "card-title" })}
                <section className="card-details">{props.children}</section>
            </div>
        </section>
    );
};
