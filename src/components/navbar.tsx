import React from "react";
import { NAVBAR_PAGES } from "./site_map";
import { Link } from "react-router-dom";

export interface NavbarProps extends React.ComponentPropsWithoutRef<'nav'> {

}

export const Navbar = (props: NavbarProps) => {
    const { ...rest } = props;
    return (
        <nav {...rest}>
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
