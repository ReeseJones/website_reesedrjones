import * as React from "react";
import { Navbar } from "./navbar";
import "./header.scss";

export const Header = () => {
    return (
        <header>
            <section className="logo">Reese Jones</section>
            <Navbar></Navbar>
        </header>
    );
};
