import React from "react";
import { NAVBAR_PAGES } from "./site_map";
import { Link } from "react-router";

export const Navbar = () => {
    return (
        <nav>
            {NAVBAR_PAGES.map((page) => {
                return (
                    <Link key={page.path} to={page.path}>
                        {page.name}
                    </Link>
                );
            })}
        </nav>
    );
};
