import type React from "react";
import type { IScene, SceneFrameCallback } from "../core/scene_types";
import type { ISceneNode } from "../core/scene_node_types";
import type { ICamera } from "../camera/camera_types";
import type { IMeshGeometry } from "../models/mesh_geometry_types";
import type { IMaterial } from "../materials/material_types";
import type { IModelInstance } from "../models/model_instance_types";
import type { Vector3Like } from "../../maths/vector_types";
import type { EulerAngles } from "../core/transform_types";

/**
 * 3-component spatial coordinate vector [x, y, z].
 */
export type Vector3Tuple = [x: number, y: number, z: number];

/**
 * 3-component Euler rotation angles in radians [pitch, yaw, roll] (YXZ order).
 */
export type EulerTuple = [pitch: number, yaw: number, roll: number];

/**
 * Common spatial and hierarchical props shared by all scene graph node components.
 */
export interface SceneNodeProps {
    /** Label for debugging */
    name?: string;
    /** Position relative to parent [x, y, z] */
    position?: Vector3Like | Vector3Tuple;
    /** Euler rotation angles in radians [pitch, yaw, roll] */
    rotation?: EulerAngles | EulerTuple;
    /** Uniform scalar or 3-component scale [x, y, z] */
    scale?: Vector3Like | Vector3Tuple | number;
    /** Local visibility toggle */
    visible?: boolean;
    /** Nested children scene nodes */
    children?: React.ReactNode;
    /** Direct React 19 node ref */
    ref?: React.Ref<ISceneNode>;
}

/**
 * Root scene context providing the active scene, active camera, camera registration,
 * and independent simulation frame subscription.
 */
export interface ISceneContextValue {
    /** Underlying programmatic scene instance */
    readonly scene: IScene;
    /** Current active camera rendering the scene */
    readonly activeCamera: ICamera | null;
    /** Manually appoint the active camera */
    setActiveCamera: (camera: ICamera | null) => void;
    /** Registers a camera with the scene. Returns unregister cleanup closure. */
    registerCamera: (camera: ICamera, makeDefault?: boolean) => () => void;
    /** Subscribes a simulation/behavior callback to the scene's independent RAF loop. */
    subscribeFrame: (callback: SceneFrameCallback, priority?: number) => () => void;
}

/**
 * Immediate parent context in the scene graph hierarchy.
 */
export interface IParentNodeContextValue {
    /** Immediate parent scene node in the graph hierarchy */
    readonly parent: ISceneNode;
}

/**
 * Configuration props for the declarative <Scene /> root component.
 */
export interface SceneProps {
    /** Pass execution priority in WebGLCanvas (default: 10) */
    priority?: number;
    /** Whether to clear the depth buffer prior to rendering (default: true) */
    clearDepth?: boolean;
    /** Scene graph children (cameras, groups, model instances) */
    children?: React.ReactNode;
    /** Direct ref to underlying programmatic Scene */
    ref?: React.Ref<IScene>;
}

/**
 * Configuration props for the declarative <Group /> node component.
 */
export interface GroupProps extends SceneNodeProps {
    /** Direct ref to underlying programmatic SceneNode */
    ref?: React.Ref<ISceneNode>;
}

/**
 * Configuration props for the declarative <PerspectiveCamera /> component.
 */
export interface PerspectiveCameraProps extends SceneNodeProps {
    /** Field of view in degrees (default: 60) */
    fov?: number;
    /** Near clipping plane distance (default: 0.1) */
    near?: number;
    /** Far clipping plane distance (default: 1000.0) */
    far?: number;
    /** Explicit aspect ratio; if omitted, automatically tracks viewport */
    aspect?: number;
    /** Automatically sets this camera as the scene's active rendering camera */
    makeDefault?: boolean;
    /** Direct ref to underlying programmatic Camera */
    ref?: React.Ref<ICamera>;
}

/**
 * Configuration props for the declarative <ModelInstance /> renderable component.
 */
export interface ModelInstanceProps extends SceneNodeProps {
    /** Target geometry defining vertex layout and buffers */
    geometry: IMeshGeometry;
    /** Target material defining shader, uniforms, and pipeline state */
    material: IMaterial;
    /** Explicit render order queue (lower values render first) */
    renderOrder?: number;
    /** Direct ref to underlying programmatic ModelInstance */
    ref?: React.Ref<IModelInstance>;
}
