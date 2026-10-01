import React from "react";
import { NAVBAR_PAGES } from "./site_map";
import { Link } from "react-router-dom";
import { GearIcon } from "./icons/gear_icon";

export interface NavbarProps extends React.ComponentPropsWithoutRef<'nav'> {
    onOpenSettings?: () => void;
}

export const Navbar = (props: NavbarProps) => {
    const { onOpenSettings, ...rest } = props;

    return (
        <nav {...rest}>
            {NAVBAR_PAGES.map((page) => {
                return (
                    <Link key={page.path} to={page.path}>
                        {page.name}
                    </Link>
                );
            })}
            {onOpenSettings && (
                <button
                    type="button"
                    className="galaxy-settings-toggle"
                    onClick={onOpenSettings}
                    aria-label="Galaxy Backdrop Settings"
                    title="Galaxy Backdrop Settings"
                >
                    <GearIcon />
                    <span className="toggle-label">Backdrop Settings</span>
                </button>
            )}
        </nav>
    );
};
