import { GalaxyParameters, DEFAULT_GALAXY_PARAMETERS, MOBILE_GALAXY_PARAMETERS } from "./parameters/index";
import galacticCloudVert, { GalacticCloudUniforms } from "./shaders/galactic_cloud.vert";
import galacticCloudFrag from "./shaders/galactic_cloud.frag";
import { CanvasDimensions, TimeInfo } from "../components/webgl_canvas/types";
import { ShaderProgram } from "../webgl/shaders/shader_program";
import { VertexBuffer } from "../webgl/geometry/vertex_buffer";
import { parseVertexLayoutFromGLSL } from "../webgl/geometry/vertex_layout";
import type { IWebGLContextManager } from "../webgl/core/context_manager_types";
import { OrientationInputController } from "./orientation_input";

/**
 * Pure WebGL2 rendering engine for the Celestial Horizon background pass.
 * Draws a fullscreen quad using multi-stop horizon color gradients.
 * Uses WebGLContextManager for persistent shader retrieval and managed VertexBuffer resources.
 */
export class GalacticCloudRenderer {
    private gl: WebGL2RenderingContext | null = null;

    private shaderProgram: ShaderProgram<GalacticCloudUniforms> | null = null;
    private quadBuffer: VertexBuffer | null = null;

    private params: GalaxyParameters;

    // Input Parallax State
    private targetPitchOffset = 0;
    private currentPitchOffset = 0;
    private targetYawOffset = 0;
    private currentYawOffset = 0;
    private orientationController: OrientationInputController;

    private isDestroyed = false;

    constructor(
        private contextManager: IWebGLContextManager,
        customParams?: Partial<GalaxyParameters>
    ) {
        const isMobile =
            typeof window !== "undefined" &&
            (window.innerWidth < 768 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));

        this.params = {
            ...DEFAULT_GALAXY_PARAMETERS,
            ...(isMobile ? MOBILE_GALAXY_PARAMETERS : {}),
            ...customParams,
        };

        this.orientationController = new OrientationInputController({
            onUpdate: (pitch, yaw) => {
                this.targetPitchOffset = pitch;
                this.targetYawOffset = yaw;
            },
        });
    }

    public init(gl: WebGL2RenderingContext, dims: CanvasDimensions): boolean {
        this.gl = gl;
        this.isDestroyed = false;

        this.shaderProgram = this.contextManager.getOrCreateShader<GalacticCloudUniforms>("galactic_cloud", {
            vertSource: galacticCloudVert,
            fragSource: galacticCloudFrag,
            label: "GalacticCloudShader",
        });

        if (!this.shaderProgram.isValid) return false;
        this.contextManager.useShader(this.shaderProgram);

        if (!this.quadBuffer) {
            const layout = parseVertexLayoutFromGLSL(galacticCloudVert);
            this.quadBuffer = this.contextManager.geometries.createVertexBuffer(layout);
        }

        // Triangle strip unit quad positions: [ -1,-1,  1,-1,  -1,1,  1,1 ]
        const quadPositions = new Float32Array([
            -1.0, -1.0,
             1.0, -1.0,
            -1.0,  1.0,
             1.0,  1.0,
        ]);
        this.quadBuffer.setData(quadPositions);

        this.uploadStaticUniforms();
        this.attachEventListeners();
        this.updateProjection(gl, dims);

        return true;
    }

    public uploadStaticUniforms(): void {
        if (!this.shaderProgram) return;

        const centerColor = this.params.horizonColorCenter ?? [1.0, 0.84, 0.66];
        const outerColor = this.params.horizonColorOuter ?? [0.15, 0.25, 0.85];

        this.shaderProgram.setUniforms({
            uHorizonIntensity: this.params.horizonIntensity,
            uHorizonThickness: this.params.horizonThickness,
            uHorizonColorCenter: centerColor,
            uHorizonColorOuter: outerColor,
        });
    }

    public updateProjection(gl: WebGL2RenderingContext, dims: CanvasDimensions): void {
        if (!this.gl || this.isDestroyed) return;
        gl.viewport(0, 0, dims.width, dims.height);
    }

    /**
     * Executes a single frame draw pass for the celestial horizon pass.
     * Asserts explicit pass state ownership (blending and depth settings) prior to drawing.
     */
    public renderFrame(
        gl: WebGL2RenderingContext,
        timeInfo: TimeInfo,
        dims: CanvasDimensions
    ): void {
        if (!gl || !this.shaderProgram || !this.quadBuffer || this.isDestroyed || !this.params.cloudEnabled) return;

        this.updateInputs(timeInfo.dt);

        this.contextManager.useShader(this.shaderProgram);
        this.quadBuffer.bind();

        // Calculate FOV scale factor for view-ray reconstruction
        const fovRad = (this.params.fov * Math.PI) / 180.0;
        const fovScale = Math.tan(fovRad * 0.5);

        const parallax = this.params.cloudParallaxFactor ?? 0.25;
        const effectivePitchOffset = this.currentPitchOffset * this.params.mouseSensitivity * parallax;
        const effectiveYawOffset = this.currentYawOffset * this.params.mouseSensitivity * parallax;

        // Upload Per-Frame Dynamic Uniforms with compile-time type safety
        this.shaderProgram.setUniforms({
            uAspect: dims.aspect,
            uFovScale: fovScale,
            uPitch: this.params.pitchAngle,
            uYaw: this.params.yawAngle,
            uRoll: this.params.rollAngle,
            uPitchOffset: effectivePitchOffset,
            uYawOffset: effectiveYawOffset,
        });

        // Assert Explicit Pass Pipeline State via WebGLContextManager & Draw Fullscreen Quad
        this.contextManager.applyPipelineState({
            depthTest: false,
            depthWrite: false,
            blendMode: "alpha",
            cullFace: false,
        });

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    public updateParameters(newParams: Partial<GalaxyParameters>): void {
        if (this.isDestroyed || !this.gl) return;
        this.params = {
            ...this.params,
            ...newParams,
        };
        this.uploadStaticUniforms();
    }

    public onContextLost(): void {
        this.gl = null;
    }

    public onContextRestored(gl: WebGL2RenderingContext, dims: CanvasDimensions): void {
        this.gl = gl;
        this.uploadStaticUniforms();
        this.updateProjection(gl, dims);
    }

    public destroy(): void {
        this.isDestroyed = true;
        this.detachEventListeners();

        if (this.quadBuffer) {
            this.quadBuffer.dispose();
            this.quadBuffer = null;
        }

        if (this.shaderProgram) {
            this.shaderProgram.dispose();
            this.shaderProgram = null;
        }

        this.gl = null;
    }

    private updateInputs(dt: number): void {
        const factor = Math.min(1.0, dt * (this.params.inputDamping ?? 4.5));
        this.currentPitchOffset += (this.targetPitchOffset - this.currentPitchOffset) * factor;
        this.currentYawOffset += (this.targetYawOffset - this.currentYawOffset) * factor;
    }

    private attachEventListeners(): void {
        this.orientationController.attach();
    }

    private detachEventListeners(): void {
        this.orientationController.detach();
    }
}
