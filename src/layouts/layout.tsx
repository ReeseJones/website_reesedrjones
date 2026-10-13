import "../styles.scss";
import { useState, type ReactNode, useCallback } from "react";
import { Footer } from "../components/footer";
import { Header } from "../components/header";
import { useGalaxyController } from "../galaxy_backdrop/use_galaxy_controller";
import { WebGLCanvas } from "../components/webgl_canvas/webgl_canvas";
import { GalaxyScene } from "../galaxy_backdrop/galaxy_scene";
import { SettingsDialog } from "../components/settings_dialog/settings_dialog";
import { SettingsTab } from "../components/settings_dialog/settings_tab";
import { GeneralSettingsSection } from "../components/settings_dialog/general_settings_section";
import { GalaxySettingsTab } from "../components/settings_dialog/galaxy_settings_tab";
import { Outlet } from "react-router-dom";
import { useResizeCallbackRef } from "../hooks/use_resize_callback_ref";
import type { Dimensions } from "../hooks/use_resize_callback_ref_types";
import { classNameMap } from "../lib/classNameMap";
import { FpsCounter } from "../components/webgl_canvas/fps_counter";
import {
    SiteSettingsProvider,
    useSiteSettingsContext,
} from "../settings/site_settings_context";
import { DEFAULT_ACTIVE_TAB_ID } from "../components/settings_dialog/settings_dialog_types";

export interface LayoutProps {
    children?: ReactNode;
}

export enum DeviceSize {
    Mobile,
    Desktop,
}

const DESKTOP_MIN_WIDTH_PX = 600;

function LayoutContent(props: LayoutProps): React.JSX.Element {
    const backdropGalaxy = useGalaxyController();
    const { settings, updateSettings, resetSettings } = useSiteSettingsContext();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [deviceSize, setDeviceSize] = useState(DeviceSize.Mobile);

    const handleResize = useCallback((size: Dimensions) => {
        setDeviceSize(
            size.width > DESKTOP_MIN_WIDTH_PX
                ? DeviceSize.Desktop
                : DeviceSize.Mobile
        );
    }, []);

    const setObserveTarget = useResizeCallbackRef(handleResize);

    const classMap = classNameMap({
        "anim-background": true,
        desktop: deviceSize === DeviceSize.Desktop,
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
                <GalaxyScene controller={backdropGalaxy} />
                {settings.debug.showFps && <FpsCounter position="top-left" />}
            </WebGLCanvas>

            <Header onOpenSettings={() => setIsSettingsOpen(true)} />
            <div className="scroll-region">
                <div className="content">
                    <Outlet />
                    {props.children}
                </div>
                <Footer />
            </div>

            <SettingsDialog
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                defaultTabId={DEFAULT_ACTIVE_TAB_ID}
            >
                <SettingsTab id="general" label="General">
                    <GeneralSettingsSection
                        settings={settings}
                        onChange={updateSettings}
                        onReset={resetSettings}
                    />
                </SettingsTab>
                <SettingsTab id="galaxy" label="Galaxy Backdrop">
                    <GalaxySettingsTab controller={backdropGalaxy} />
                </SettingsTab>
            </SettingsDialog>
        </div>
    );
}

export const Layout = (props: LayoutProps): React.JSX.Element => {
    return (
        <SiteSettingsProvider>
            <LayoutContent {...props} />
        </SiteSettingsProvider>
    );
};
