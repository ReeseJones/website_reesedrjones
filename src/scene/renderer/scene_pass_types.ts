import type { IScene } from "../core/scene_types";
import type { ICamera } from "../camera/camera_types";

/**
 * Configuration props for the declarative <ScenePass /> canvas bridge component.
 */
export interface ScenePassProps {
    /** 3D scene root containing nodes and model instances */
    scene: IScene;

    /** Active camera defining view and projection matrices */
    camera: ICamera;

    /**
     * Pass execution priority in the <WebGLCanvas> compositor pipeline.
     * Lower numbers execute earlier (e.g. background passes at 0, scene at 10, overlays at 100).
     * Defaults to 10.
     */
    priority?: number;

    /**
     * Whether to clear the depth buffer prior to rendering the scene.
     * Ensures depth writes from earlier passes do not occlude 3D scene objects.
     * Defaults to true.
     */
    clearDepth?: boolean;
}
