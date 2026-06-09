import "./hamburger_menu.scss";

import {useId, useState} from "react";
import { Dialog } from "./dialog";


export interface HamburgerMenuProps extends React.ComponentPropsWithoutRef<'div'> {
    isOpen: boolean;
    onClose: () => void;
    onOpenClicked: () => void;
    modelHeadingContent?: React.ReactNode;
    children?: React.ReactNode;
}

export function HamburgerMenu(props: HamburgerMenuProps) {
    const { children, isOpen, onClose, onOpenClicked, modelHeadingContent, ...rest } = props;

    const buttonId = useId();
    const menuId = useId();

    const headingContent = modelHeadingContent && (
        <header>
            {modelHeadingContent}
        </header>
    ) || null;


    return (
        <div {...rest} className="hamburger-menu">
            <button id={buttonId} aria-controls={menuId} onClick={onOpenClicked}>
                ☰
            </button>
            <div className="content">
                {children}
            </div>
            <Dialog id={menuId} isOpen={isOpen} onClose={onClose} onClick={onClose}>
                {headingContent}
                {children}
            </Dialog>
        </div>
    );
}