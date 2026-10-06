import "../styles.scss";
import { useState, ReactNode, useCallback } from "react";
import { Footer } from "../components/footer";
import { Header } from "../components/header";
import { useGalaxyController } from "../galaxy_backdrop/use_galaxy_controller";
import { WebGLCanvas } from "../components/webgl_canvas/webgl_canvas";
import { GalacticCloudPass } from "../galaxy_backdrop/galactic_cloud_pass";
import { ImperativeGalaxyScenePass } from "../scene/test/imperative_galaxy_scene_pass";
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

export const Layout = (props: LayoutProps) => {
    const backdropGalaxy = useGalaxyController();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [deviceSize, setDeviceSize] = useState(DeviceSize.Mobile);

    const handleResize = useCallback((size: Dimensions) => {
        setDeviceSize(size.width > 600 ? DeviceSize.Desktop : DeviceSize.Mobile);
    }, []);

    const setObserveTarget = useResizeCallbackRef(handleResize);

    const classMap = classNameMap({
        "anim-background": true,
        "desktop": deviceSize === DeviceSize.Desktop
    });

    return (
        <div className={classMap} ref={setObserveTarget}>
            <WebGLCanvas
                options={{
                    version: "webgl2",
                    dprCap: backdropGalaxy.params.dprCap ?? 1.5,
                    pauseWhenOffscreen: true,
                    pauseWhenHidden: true,
                }}
                className="hero-effect"
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    pointerEvents: "none",
                }}
            >
                <GalacticCloudPass controller={backdropGalaxy} priority={-10} />
                {/* Imperative 3D Scene Architecture Test Pass */}
                <ImperativeGalaxyScenePass controller={backdropGalaxy} />
            </WebGLCanvas>

            <Header onOpenSettings={() => setIsSettingsOpen(true)} />
            <div className="scroll-region">
                <div className="content">
                    <Outlet />
                </div>
                <Footer />
            </div>

            <GalaxySettingsDialog
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                params={backdropGalaxy.params}
                currentPresetId={backdropGalaxy.currentPresetId}
                onChange={backdropGalaxy.updateParameters}
                onReset={backdropGalaxy.resetParameters}
                onApplyPreset={backdropGalaxy.applyPreset}
            />
        </div>
    );
};
