import "../styles.scss";
import { useState, ReactNode, useCallback, useRef } from "react";
import { Footer } from "../components/footer";
import { Header } from "../components/header";
import { usePixiApp } from "../hooks/use_pixi_app";
import { usePixiStarBackground } from "../hooks/use_pixi_star_background";
import { Outlet } from "react-router";
import { useResizeCallbackRef, Dimensions } from "../hooks/use_resize_callback_ref";
import { classNameMap } from "../lib/classNameMap";


export interface LayoutProps {
    children?: ReactNode;
}

export enum DeviceSize {
    Mobile,
    Desktop
}

export const Layout = (props: LayoutProps) => {
    const [rootStarCount, setRootStarCount] = useState(100);
    const [starDepth, setStarDepth] = useState(7);
    const [maxEdges, setMaxEdges] = useState(3);
    const [minEdges, setMinEdges] = useState(1);
    const [setAppContainer, pixiAppRef, appReady] = usePixiApp();
    const [deviceSize, setDeviceSize] = useState(DeviceSize.Mobile);

    const [starField, starfieldIsReady] = usePixiStarBackground(
        pixiAppRef,
        appReady,
        starDepth,
        maxEdges,
        minEdges,
        rootStarCount
    );

    const handleResize = useCallback((size: Dimensions, element: HTMLElement) => {
        const { width, height } = size;

        if ( width > 600 ) {
            setDeviceSize(DeviceSize.Desktop);
            console.log(`Use Desktop Layout`);
        } else {
            setDeviceSize(DeviceSize.Mobile);
            console.log(`Use Mobile Layout`);
        }
    }, []);

    const setObserveTarget = useResizeCallbackRef(handleResize);

    const setRootContainer = useCallback((container: HTMLDivElement | null) => {
        setAppContainer(container);
        setObserveTarget(container);
    }, []);

    const classMap = classNameMap({
        "anim-background": true,
        "desktop": deviceSize === DeviceSize.Desktop
    });

    return (
    <div className={classMap} ref={setRootContainer}>
        <Header />
        <div className="scroll-region">
            <div className="content">
                <Outlet />
            </div>
            <Footer />
        </div>
    </div>
    );
};
