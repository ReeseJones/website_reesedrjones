import "./card.scss";
import {Link} from "react-router-dom";
import { ARTICLE_PAGES } from "./index_instance";

export const ArticlesIndexPage = () => {

    const cards = ARTICLE_PAGES.map((page) => {
        return <section className="card" key={page.path}>
            {page.details.heroImageUrl && <img className="card-background"
                 src={page.details.heroImageUrl}
                 alt={page.details.heroImageAlt}
            />}
            <div className="card-content">
                <Link to={page.path}>
                    {<h2 className="card-title">{page.details.title} </h2>}
                </Link>
                <section className="card-details">
                    { page.details.subtitle && <p className="description">{page.details.description}</p> }
                    <p>
                        Date: {page.details.date}
                    </p>
                </section>
            </div>
        </section>
    });

    return (
        <div className="page-content grid">
            <div className="col col-12">
                <h1>Articles</h1>
            </div>
            <div className="col col-12">
                <div className="card-container">
                    {cards}
                </div>
            </div>
        </div>
    );
};
