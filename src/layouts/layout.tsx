import "../styles.scss";
import { useState, ReactNode, useCallback } from "react";
import { Footer } from "../components/footer";
import { Header } from "../components/header";
import { GalaxyProvider, useGalaxy } from "../galaxy_backdrop/galaxy_context";
import { GalaxySettingsDialog } from "../galaxy_backdrop/galaxy_settings_dialog/galaxy_settings_dialog";
import { Outlet } from "react-router-dom";
import { useResizeCallbackRef, Dimensions } from "../hooks/use_resize_callback_ref";
import { classNameMap } from "../lib/classNameMap";

export interface LayoutProps {
    children?: ReactNode;
}

export enum DeviceSize {
    Mobile,
    Desktop
}

function LayoutContent(props: LayoutProps) {
    const { setBackdropContainer } = useGalaxy();
    const [deviceSize, setDeviceSize] = useState(DeviceSize.Mobile);

    const handleResize = useCallback((size: Dimensions, element: HTMLElement) => {
        const { width, height } = size;

        if ( width > 600 ) {
            setDeviceSize(DeviceSize.Desktop);
        } else {
            setDeviceSize(DeviceSize.Mobile);
        }
    }, []);

    const setObserveTarget = useResizeCallbackRef(handleResize);

    const setRootContainer = useCallback((container: HTMLDivElement | null) => {
        setBackdropContainer(container);
        setObserveTarget(container);
    }, [setBackdropContainer, setObserveTarget]);

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
            <GalaxySettingsDialog />
        </div>
    );
}

export const Layout = (props: LayoutProps) => {
    return (
        <GalaxyProvider>
            <LayoutContent {...props} />
        </GalaxyProvider>
    );
};

