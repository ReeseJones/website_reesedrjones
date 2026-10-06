import { useEffect, useRef } from "react";
import { mat4, quat, vec3 } from "gl-matrix";
import { useWebGLPass } from "../../components/webgl_canvas/use_webgl_pass";
import { useWebGLContext } from "../../components/webgl_canvas/webgl_context";
import { Scene } from "../core/scene";
import { PerspectiveCamera } from "../camera/perspective_camera";
import { GalaxyGeometry } from "../models/galaxy_geometry";
import { GalaxyMaterial } from "../materials/galaxy_material";
import { ScreenQuadGeometry } from "../models/screen_quad_geometry";
import { GalacticCloudMaterial } from "../materials/galactic_cloud_material";
import {
    GALACTIC_CLOUD_RENDER_ORDER,
    DEFAULT_CLOUD_PARALLAX_FACTOR,
    DEG_TO_RAD,
    HALF_FOV_FACTOR,
} from "../materials/galactic_cloud_material_constants";
import { BlendMode } from "../materials/material_types";
import { ModelInstance } from "../models/model_instance";
import { SceneRenderer } from "../renderer/scene_renderer";
import { OrientationInputController } from "../../galaxy_backdrop/orientation_input";
import { DEFAULT_GALAXY_PARAMETERS } from "../../galaxy_backdrop/parameters/index";
import type { GalaxyParameters } from "../../galaxy_backdrop/parameters/types";
import type { ImperativeGalaxyScenePassProps } from "./imperative_galaxy_scene_types";

/**
 * Imperative test pass component that drives the 3D scene engine architecture
 * (Scene, PerspectiveCamera, GalaxyGeometry, GalaxyMaterial, ModelInstance, SceneRenderer)
 * to render the spiral galaxy backdrop inside the React app.
 */
export function ImperativeGalaxyScenePass({
    controller,
    params: rawParams,
    priority = 0,
    clearDepth = false,
}: ImperativeGalaxyScenePassProps): null {
    const activeParams = controller?.params ?? rawParams ?? DEFAULT_GALAXY_PARAMETERS;
    const { contextManager } = useWebGLContext();

    const sceneRef = useRef<Scene | null>(null);
    const cameraRef = useRef<PerspectiveCamera | null>(null);
    const geometryRef = useRef<GalaxyGeometry | null>(null);
    const materialRef = useRef<GalaxyMaterial | null>(null);
    const modelRef = useRef<ModelInstance | null>(null);
    const cloudGeometryRef = useRef<ScreenQuadGeometry | null>(null);
    const cloudMaterialRef = useRef<GalacticCloudMaterial | null>(null);
    const cloudModelRef = useRef<ModelInstance | null>(null);
    const rendererRef = useRef<SceneRenderer | null>(null);
    const orientationControllerRef = useRef<OrientationInputController | null>(null);

    // Parallax damping state
    const targetPitchOffset = useRef(0);
    const currentPitchOffset = useRef(0);
    const targetYawOffset = useRef(0);
    const currentYawOffset = useRef(0);

    // Cached gl-matrix structures to avoid allocation in render loop
    const viewMatrixRef = useRef<mat4>(mat4.create());
    const invCameraWorldRef = useRef<mat4>(mat4.create());
    const rotQuatRef = useRef<quat>(quat.create());
    const transVecRef = useRef<vec3>(vec3.create());

    // Keep active parameters accessible in the animation loop
    const paramsRef = useRef<GalaxyParameters>(activeParams);
    paramsRef.current = activeParams;

    useWebGLPass({
        priority,
        init: (gl, dims) => {
            const currentParams = paramsRef.current;

            // 1. Root Scene Graph
            const scene = new Scene("GalaxyTestScene");

            // 2. Camera Configuration
            const camera = new PerspectiveCamera(
                {
                    fov: currentParams.fov,
                    near: currentParams.nearPlane,
                    far: currentParams.farPlane,
                    aspect: dims.aspect,
                },
                "BackdropCamera"
            );

            // 3. Geometry & Material Construction
            const geometry = new GalaxyGeometry({ params: currentParams });
            const material = new GalaxyMaterial({
                params: currentParams,
                pipelineState: {
                    blendMode: BlendMode.Additive,
                    depthTest: false,
                    depthWrite: false,
                    cullFace: false,
                },
            });

            // 4. Model Instance Registration
            const model = new ModelInstance(geometry, material, "GalaxyModel");

            // 5. Cloud Background Geometry, Material & Model Registration
            const cloudGeometry = new ScreenQuadGeometry();
            const cloudMaterial = new GalacticCloudMaterial({
                params: currentParams,
            });
            const cloudModel = new ModelInstance(cloudGeometry, cloudMaterial, "GalacticCloudModel");
            cloudModel.renderOrder = GALACTIC_CLOUD_RENDER_ORDER;
            cloudModel.visible = currentParams.cloudEnabled ?? true;

            scene.add(camera);
            scene.add(cloudModel);
            scene.add(model);

            // 6. Scene Renderer Setup
            const renderer = new SceneRenderer(contextManager);

            // 7. Orientation / Input Controller
            const orientationController = new OrientationInputController({
                onUpdate: (pitch, yaw) => {
                    targetPitchOffset.current = pitch;
                    targetYawOffset.current = yaw;
                },
            });

            sceneRef.current = scene;
            cameraRef.current = camera;
            geometryRef.current = geometry;
            materialRef.current = material;
            modelRef.current = model;
            cloudGeometryRef.current = cloudGeometry;
            cloudMaterialRef.current = cloudMaterial;
            cloudModelRef.current = cloudModel;
            rendererRef.current = renderer;
            orientationControllerRef.current = orientationController;
        },
        render: (gl, timeInfo, dims) => {
            const renderer = rendererRef.current;
            const scene = sceneRef.current;
            const camera = cameraRef.current;
            if (!renderer || !scene || !camera) return;

            const p = paramsRef.current;

            // Parallax interpolation
            const factor = Math.min(1.0, timeInfo.dt * 5.0);
            currentPitchOffset.current +=
                (targetPitchOffset.current - currentPitchOffset.current) * factor;
            currentYawOffset.current +=
                (targetYawOffset.current - currentYawOffset.current) * factor;

            // Synchronize camera perspective settings
            camera.fov = p.fov;
            camera.near = p.nearPlane;
            camera.far = p.farPlane;

            // Synthesize view matrix matching parallax, offset, and distance
            const aspectScale = Math.min(1.0, dims.aspect / 1.5);
            const offsetX = p.centerOffsetX * aspectScale;
            const offsetY = p.centerOffsetY;

            const pitch =
                p.pitchAngle + currentPitchOffset.current * p.mouseSensitivity;
            const yaw =
                p.yawAngle + currentYawOffset.current * p.mouseSensitivity;
            const roll = p.rollAngle;

            const v = viewMatrixRef.current;
            mat4.identity(v);
            mat4.translate(v, v, [offsetX, offsetY, -p.cameraDistance]);
            mat4.rotateX(v, v, pitch);
            mat4.rotateY(v, v, yaw);
            mat4.rotateZ(v, v, roll);

            // Convert view matrix to Camera world transform
            const invW = invCameraWorldRef.current;
            if (mat4.invert(invW, v)) {
                const q = rotQuatRef.current;
                const t = transVecRef.current;
                mat4.getRotation(q, invW);
                mat4.getTranslation(t, invW);
                camera.transform.setPosition(t[0], t[1], t[2]);
                camera.transform.setRotationQuaternion(q[0], q[1], q[2], q[3]);
            }

            // Update dynamic frame uniforms and visibility for galactic cloud
            const cloudMaterial = cloudMaterialRef.current;
            const cloudModel = cloudModelRef.current;
            if (cloudMaterial && cloudModel) {
                const fovRad = p.fov * DEG_TO_RAD;
                const fovScale = Math.tan(fovRad * HALF_FOV_FACTOR);

                const parallax = p.cloudParallaxFactor ?? DEFAULT_CLOUD_PARALLAX_FACTOR;
                const effectivePitchOffset =
                    currentPitchOffset.current * p.mouseSensitivity * parallax;
                const effectiveYawOffset =
                    currentYawOffset.current * p.mouseSensitivity * parallax;

                cloudMaterial.updateFrameUniforms({
                    aspect: dims.aspect,
                    fovScale,
                    pitch: p.pitchAngle,
                    yaw: p.yawAngle,
                    roll: p.rollAngle,
                    effectivePitchOffset,
                    effectiveYawOffset,
                });

                cloudModel.visible = p.cloudEnabled ?? true;
            }

            // Execute scene graph render pass
            renderer.render(scene, camera, {
                timeInfo,
                dimensions: dims,
                clearDepth,
            });
        },
        resize: (_gl, dims) => {
            cameraRef.current?.updateAspectRatio(dims.aspect);
        },
        destroy: () => {
            orientationControllerRef.current?.detach();
            orientationControllerRef.current = null;

            cloudGeometryRef.current?.dispose();
            cloudGeometryRef.current = null;

            cloudMaterialRef.current?.dispose();
            cloudMaterialRef.current = null;

            cloudModelRef.current = null;

            geometryRef.current?.dispose();
            geometryRef.current = null;

            rendererRef.current?.reset();
            rendererRef.current = null;

            sceneRef.current = null;
            cameraRef.current = null;
            materialRef.current = null;
            modelRef.current = null;
        },
    });

    // Update material uniforms and rebuild geometry if star count/morphology changes
    useEffect(() => {
        if (!geometryRef.current || !materialRef.current) return;

        const currentGeoParams = geometryRef.current.galaxyParams;
        const needsGeometryRebuild =
            (activeParams.starCount !== undefined &&
                activeParams.starCount !== currentGeoParams.starCount) ||
            (activeParams.armCount !== undefined &&
                activeParams.armCount !== currentGeoParams.armCount) ||
            (activeParams.armWinding !== undefined &&
                activeParams.armWinding !== currentGeoParams.armWinding) ||
            (activeParams.armDispersion !== undefined &&
                activeParams.armDispersion !== currentGeoParams.armDispersion) ||
            (activeParams.spurFrequency !== undefined &&
                activeParams.spurFrequency !== currentGeoParams.spurFrequency) ||
            (activeParams.coreRadius !== undefined &&
                activeParams.coreRadius !== currentGeoParams.coreRadius) ||
            (activeParams.diskRadius !== undefined &&
                activeParams.diskRadius !== currentGeoParams.diskRadius) ||
            (activeParams.diskThickness !== undefined &&
                activeParams.diskThickness !== currentGeoParams.diskThickness) ||
            (activeParams.coreDensityRatio !== undefined &&
                activeParams.coreDensityRatio !== currentGeoParams.coreDensityRatio);

        if (needsGeometryRebuild && modelRef.current) {
            geometryRef.current.dispose();
            const newGeo = new GalaxyGeometry({ params: activeParams });
            modelRef.current.geometry = newGeo;
            geometryRef.current = newGeo;
        }

        cloudMaterialRef.current?.updateParameters(activeParams);
        materialRef.current.updateParameters(activeParams);
    }, [activeParams]);

    return null;
}

