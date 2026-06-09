import { Navbar } from "./navbar";
import "./header.scss";
import { HamburgerMenu } from "./hamburger_menu";
import { useState, useCallback } from "react";

export const Header = () => {

    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const openMenu = useCallback(() => {
        setIsMenuOpen(true);
    }, []);

    const closeMenu = useCallback(() => {
        setIsMenuOpen(false);
    }, []);

    const headingContent = <div className="hamburger-menu-heading">
        <div className="flex row">
            <h2>Site Navigation</h2>
        </div>
        <button aria-label="Close menu" onClick={closeMenu}>
            <div>✕</div>
        </button>
    </div>;

    return (
        <header>
            <section className="logo">Reese Jones</section>
            <HamburgerMenu 
                isOpen={isMenuOpen}
                onOpenClicked={openMenu}
                onClose={closeMenu}
                modelHeadingContent={headingContent}>
                <Navbar id="main-navbar"></Navbar>
            </HamburgerMenu>
        </header>
    );
};
