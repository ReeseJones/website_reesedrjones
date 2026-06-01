import {useState, ReactNode} from "react";
import "../styles.scss"; // <--- includes reset and must be first
import { Footer } from "../components/footer";
import { Header } from "../components/header";
import { usePixiApp } from "../hooks/use_pixi_app";
import { usePixiStarBackground } from "../hooks/use_pixi_star_background";
import { Outlet } from "react-router";


export interface LayoutProps {
    children?: ReactNode;
}

export const Layout = (props: LayoutProps) => {
    const [rootStarCount, setRootStarCount] = useState(100);
    const [starDepth, setStarDepth] = useState(7);
    const [maxEdges, setMaxEdges] = useState(3);
    const [minEdges, setMinEdges] = useState(1);
    const [containerRef, pixiApp, viewMounted] = usePixiApp();

    usePixiStarBackground(
        pixiApp.current,
        starDepth,
        maxEdges,
        minEdges,
        rootStarCount
    );

    return (
        <>
            <div className="anim-background" ref={containerRef}>
                <Header />
                <div className="scroll-region">
                    <div className="content">
                        <Outlet />
                    </div>
                    <Footer />
                </div>
            </div>
        </>
    );
};
