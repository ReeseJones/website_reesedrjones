import React from "react";
import { NAVBAR_PAGES } from "./site_map";
import { Link } from "react-router-dom";
import { GearIcon } from "./icons/gear_icon";
import { useGalaxy } from "../galaxy_backdrop/galaxy_context";

export interface NavbarProps extends React.ComponentPropsWithoutRef<'nav'> {

}

export const Navbar = (props: NavbarProps) => {
    const { ...rest } = props;
    const { openSettings } = useGalaxy();

    return (
        <nav {...rest}>
            {NAVBAR_PAGES.map((page) => {
                return (
                    <Link key={page.path} to={page.path}>
                        {page.name}
                    </Link>
                );
            })}
            <button
                type="button"
                className="galaxy-settings-toggle"
                onClick={openSettings}
                aria-label="Galaxy Backdrop Settings"
                title="Galaxy Backdrop Settings"
            >
                <GearIcon />
                <span className="toggle-label">Backdrop Settings</span>
            </button>
        </nav>
    );
};

