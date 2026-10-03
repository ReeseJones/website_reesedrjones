import { mat3, mat4 } from "gl-matrix";
import type { IScene } from "../core/scene_types";
import type { ICamera } from "../camera/camera_types";
import type { IModelInstance } from "../models/model_instance_types";
import type { IMaterial } from "../materials/material_types";
import type { CanvasDimensions, TimeInfo } from "../../components/webgl_canvas/types";
import type { IWebGLContextManager } from "../../webgl/context_manager_types";
import type { ShaderProgram } from "../../webgl/shader_program";
import type { ISceneRenderer, RenderQueueItem } from "./scene_renderer_types";
import type { ShaderKey } from "../../webgl/shader_types";
import galaxyPinprickVert from "../../galaxy_backdrop/shaders/galaxy_pinprick.vert";
import galaxyPinprickFrag from "../../galaxy_backdrop/shaders/galaxy_pinprick.frag";
import galaxyOrbVert from "../../galaxy_backdrop/shaders/galaxy_orb.vert";
import galaxyOrbFrag from "../../galaxy_backdrop/shaders/galaxy_orb.frag";
import unlitVert from "../shaders/unlit.vert";
import unlitFrag from "../shaders/unlit.frag";

/**
 * Concrete 3D Scene Renderer executing hierarchical scene graph traversal,
 * camera view-projection synchronization, pipeline state caching via WebGLContextManager,
 * three-tier uniform distribution, and indexed/unindexed draw calls.
 */
export class SceneRenderer implements ISceneRenderer {
    public readonly contextManager: IWebGLContextManager;

    private readonly _modelViewMatrix: Float32Array = new Float32Array(16);
    private readonly _normalMatrix: Float32Array = new Float32Array(9);
    private readonly _cameraPosition: [number, number, number] = [0, 0, 0];
    private readonly _renderQueue: RenderQueueItem[] = [];
    private readonly _warnedShaders: Set<ShaderKey> = new Set();

    constructor(contextManager: IWebGLContextManager) {
        this.contextManager = contextManager;
    }

    public init(gl: WebGL2RenderingContext, _dims: CanvasDimensions): void {
        this.contextManager.setContext(gl);
    }

    public renderFrame(
        gl: WebGL2RenderingContext,
        scene: IScene,
        camera: ICamera,
        timeInfo: TimeInfo,
        dims: CanvasDimensions
    ): void {
        // Stage 1: Hierarchical transform propagation
        scene.update();

        // Stage 2: Camera matrix synchronization
        camera.updateAspectRatio(dims.aspect);
        camera.updateMatrices();

        this._cameraPosition[0] = camera.worldMatrix[12];
        this._cameraPosition[1] = camera.worldMatrix[13];
        this._cameraPosition[2] = camera.worldMatrix[14];

        // Stage 3: Collect visible renderables & stable sort by renderOrder
        this._renderQueue.length = 0;
        scene.traverseVisible((node) => {
            if ("geometry" in node && "material" in node) {
                const instance = node as unknown as IModelInstance;
                this._renderQueue.push({
                    instance,
                    renderOrder: instance.renderOrder ?? 0,
                });
            }
        });

        this._renderQueue.sort((a, b) => a.renderOrder - b.renderOrder);

        // Stages 4 & 5: Pipeline state assertion, uniform distribution, and drawing
        for (let i = 0; i < this._renderQueue.length; i++) {
            const item = this._renderQueue[i];
            const { instance } = item;
            const { geometry, material } = instance;

            // Ensure geometry GPU buffers are allocated
            if (!geometry.vertexBuffer) {
                geometry.init(gl, this.contextManager);
            }

            // Stage 4: Centralized pipeline state deduplication
            this.contextManager.applyPipelineState(material.pipelineState);

            // Shader resolution
            const shader = this.getOrResolveShader(material);
            if (!shader) continue;

            this.contextManager.useShader(shader);

            // Compute instance matrices
            mat4.multiply(
                this._modelViewMatrix as unknown as mat4,
                camera.viewMatrix as unknown as mat4,
                instance.worldMatrix as unknown as mat4
            );

            if (!mat3.normalFromMat4(this._normalMatrix as unknown as mat3, instance.worldMatrix as unknown as mat4)) {
                mat3.identity(this._normalMatrix as unknown as mat3);
            }

            // Tier A: Frame & Camera Uniforms
            shader.setMat4("u_viewProjectionMatrix", camera.viewProjectionMatrix);
            shader.setMat4("u_viewMatrix", camera.viewMatrix);
            shader.setMat4("u_projectionMatrix", camera.projectionMatrix);
            shader.setVec3("u_cameraPosition", this._cameraPosition);
            shader.setFloat("u_time", timeInfo.time);
            shader.setFloat("u_viewportHeight", dims.height);

            // Tier B: Instance Transform Uniforms
            shader.setMat4("u_modelMatrix", instance.worldMatrix);
            shader.setMat4("u_modelViewMatrix", this._modelViewMatrix);
            shader.setMat3("u_normalMatrix", this._normalMatrix);

            // Tier C: Material Domain Uniforms & Texture Units
            const textures = material.getTextures();
            if (textures.size > 0) {
                for (const [unit, tex] of textures.entries()) {
                    if (tex && tex.handle) {
                        this.contextManager.bindTexture(unit, tex.handle);
                    } else {
                        this.contextManager.bindTexture(unit, this.contextManager.getDefaultWhiteTexture());
                    }
                }
            } else if ((material.getUniforms().u_useTexture as number) > 0.5) {
                this.contextManager.bindTexture(0, this.contextManager.getDefaultWhiteTexture());
            }

            shader.setUniforms(material.getUniforms());

            // Bind VAO and issue draw call
            geometry.bind();

            if (geometry.indexCount !== null && geometry.indexCount > 0) {
                const isUint32 =
                    (geometry as unknown as { bufferData?: { indices?: unknown } }).bufferData?.indices instanceof
                    Uint32Array;
                gl.drawElements(
                    geometry.primitiveType,
                    geometry.indexCount,
                    isUint32 ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT,
                    0
                );
            } else {
                gl.drawArrays(geometry.primitiveType, 0, geometry.vertexCount);
            }
        }

        // Clean up VAO binding after pass execution
        gl.bindVertexArray(null);
    }

    public onContextLost(): void {
        this._renderQueue.length = 0;
        this.contextManager.handleContextLost();
    }

    public onContextRestored(gl: WebGL2RenderingContext, _dims: CanvasDimensions): void {
        this.contextManager.handleContextRestored(gl);
    }

    public destroy(): void {
        this._renderQueue.length = 0;
    }

    private getOrResolveShader(material: IMaterial): ShaderProgram | null {
        let shader = this.contextManager.getShader(material.shaderKey);
        if (!shader) {
            if (material.shaderKey === "galaxy_pinprick") {
                shader = this.contextManager.getOrCreateShader("galaxy_pinprick", {
                    vertSource: galaxyPinprickVert,
                    fragSource: galaxyPinprickFrag,
                    label: "galaxy_pinprick",
                });
            } else if (material.shaderKey === "galaxy_orb") {
                shader = this.contextManager.getOrCreateShader("galaxy_orb", {
                    vertSource: galaxyOrbVert,
                    fragSource: galaxyOrbFrag,
                    label: "galaxy_orb",
                });
            } else if (material.shaderKey === "unlit") {
                shader = this.contextManager.getOrCreateShader("unlit", {
                    vertSource: unlitVert,
                    fragSource: unlitFrag,
                    label: "unlit",
                });
                shader.setInt("u_texture", 0);
            }
        }

        if (!shader) {
            if (!this._warnedShaders.has(material.shaderKey)) {
                console.warn(
                    `[SceneRenderer] Shader '${material.shaderKey}' is not registered with WebGLContextManager.`
                );
                this._warnedShaders.add(material.shaderKey);
            }
            return null;
        }

        return shader;
    }
}
