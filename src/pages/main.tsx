import "../styles.scss";
import headshotPhotoFilename from "url:../images/headshot6.jpg?width=200";

export const Main = () => {
    return (
        <section className="article-body">
            <img
                src={headshotPhotoFilename}
                alt="Reese Jones head shot"
                width={200}
                height={200}
            />
            <p className="hero-title">Reese Jones</p>
            <p className="hero-body">Software Engineer, Gamer & Part-time Adventurer</p>
        </section>
    );
};
