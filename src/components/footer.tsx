import "./footer.scss";

export const Footer = () => {
    return (
        <aside className="footer">
            <section>
                <h2>Contact</h2>
                <ul>
                    <li key={"email"}>
                        <span>Email:</span> reesedrjones@gmail.com
                    </li>
                    <li key={"phone number"}>
                        <span>Phone: </span> 425-591-2419
                    </li>
                    <li key={"Linkedin"}>
                        <span>LinkedIn: </span>{" "}
                        <a href="https://www.linkedin.com/in/reesedrjones/">
                            www.linkedin.com/in/reesedrjones
                        </a>
                    </li>
                    <li key={"github"}>
                        <span>GitHub: </span>{" "}
                        <a href="https://github.com/ReeseJones">
                            https://github.com/ReeseJones
                        </a>
                    </li>
                </ul>
            </section>
        </aside>
    );
};
