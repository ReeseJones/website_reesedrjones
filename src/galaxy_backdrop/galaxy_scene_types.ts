import type React from "react";
import type { GalaxyParameters } from "./parameters/types";
import type { GalaxyController } from "./galaxy_controller_types";

/**
 * Shared damped parallax offset state written by <GalaxyCameraRig /> and read by <GalacticCloudModel />.
 */
export interface GalaxyParallaxState {
    pitchOffset: number;
    yawOffset: number;
}

/**
 * Props for the declarative <GalaxyScene /> root backdrop component.
 */
export interface GalaxySceneProps {
    /** Target galaxy parameters (used if controller is not provided) */
    params?: GalaxyParameters;
    /** Interactive galaxy controller instance */
    controller?: GalaxyController;
    /** Pass priority in <WebGLCanvas> compositor pipeline (default: 0) */
    priority?: number;
    /** Whether to clear depth buffer before drawing (default: false for background stars) */
    clearDepth?: boolean;
}

/**
 * Props for the <GalaxyCameraRig /> declarative camera and orientation controller component.
 */
export interface GalaxyCameraRigProps {
    /** Active galaxy parameters */
    params: GalaxyParameters;
    /** Optional shared ref receiving damped pitch/yaw parallax offsets each simulation frame */
    parallaxRef?: React.RefObject<GalaxyParallaxState>;
}

/**
 * Props for the <GalacticCloudModel /> declarative background horizon quad component.
 */
export interface GalacticCloudModelProps {
    /** Active galaxy parameters */
    params: GalaxyParameters;
    /** Optional shared ref providing damped pitch/yaw parallax offsets each simulation frame */
    parallaxRef?: React.RefObject<GalaxyParallaxState>;
}

/**
 * Props for the <GalaxyStarsModel /> declarative spiral starfield model component.
 */
export interface GalaxyStarsModelProps {
    /** Active galaxy parameters */
    params: GalaxyParameters;
}
