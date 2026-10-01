import { GalaxyParameters, DEFAULT_GALAXY_PARAMETERS, MOBILE_GALAXY_PARAMETERS } from "./parameters/index";
import { GALACTIC_CLOUD_FRAGMENT_SHADER, GALACTIC_CLOUD_VERTEX_SHADER } from "./galactic_cloud_shaders";
import { CanvasDimensions, TimeInfo } from "../components/webgl_canvas/types";
import { QUAD_VERTEX_LAYOUT, GALACTIC_CLOUD_UNIFORM_DECLARATIONS } from "./galactic_cloud_layout";
import { ShaderProgram } from "../webgl/shader_program";
import { VertexBuffer } from "../webgl/vertex_buffer";
import { WebGLContextManager } from "../webgl/context_manager";

/**
 * Pure WebGL2 rendering engine for the Celestial Horizon background pass.
 * Draws a fullscreen quad using multi-stop horizon color gradients.
 * Uses WebGLContextManager for persistent shader retrieval and managed VertexBuffer resources.
 */
export class GalacticCloudRenderer {
    private gl: WebGL2RenderingContext | null = null;

    private shaderProgram: ShaderProgram | null = null;
    private quadBuffer: VertexBuffer | null = null;

    private params: GalaxyParameters;

    // Input Parallax State
    private targetPitchOffset = 0;
    private currentPitchOffset = 0;
    private targetYawOffset = 0;
    private currentYawOffset = 0;

    private isDestroyed = false;

    constructor(
        private contextManager: WebGLContextManager,
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
    }

    public init(gl: WebGL2RenderingContext, dims: CanvasDimensions): boolean {
        this.gl = gl;
        this.isDestroyed = false;

        this.shaderProgram = this.contextManager.getOrCreateShader("galactic_cloud", {
            vertSource: GALACTIC_CLOUD_VERTEX_SHADER,
            fragSource: GALACTIC_CLOUD_FRAGMENT_SHADER,
            declaredUniforms: GALACTIC_CLOUD_UNIFORM_DECLARATIONS,
            label: "GalacticCloudShader",
        });

        if (!this.shaderProgram.isValid()) return false;
        this.shaderProgram.use();

        if (!this.quadBuffer) {
            this.quadBuffer = this.contextManager.createVertexBuffer(QUAD_VERTEX_LAYOUT);
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
        this.shaderProgram.use();

        this.shaderProgram.setFloat("uHorizonIntensity", this.params.horizonIntensity);
        this.shaderProgram.setFloat("uHorizonThickness", this.params.horizonThickness);

        const centerColor = this.params.horizonColorCenter ?? [1.0, 0.84, 0.66];
        const outerColor = this.params.horizonColorOuter ?? [0.15, 0.25, 0.85];

        this.shaderProgram.setVec3("uHorizonColorCenter", centerColor);
        this.shaderProgram.setVec3("uHorizonColorOuter", outerColor);
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

        this.shaderProgram.use();
        this.quadBuffer.bind();

        // Calculate FOV scale factor for view-ray reconstruction
        const fovRad = (this.params.fov * Math.PI) / 180.0;
        const fovScale = Math.tan(fovRad * 0.5);

        // Upload Per-Frame Dynamic Uniforms
        this.shaderProgram.setFloat("uAspect", dims.aspect);
        this.shaderProgram.setFloat("uFovScale", fovScale);
        this.shaderProgram.setFloat("uPitch", this.params.pitchAngle);
        this.shaderProgram.setFloat("uYaw", this.params.yawAngle);
        this.shaderProgram.setFloat("uRoll", this.params.rollAngle);

        const parallax = this.params.cloudParallaxFactor ?? 0.25;
        const effectivePitchOffset = this.currentPitchOffset * this.params.mouseSensitivity * parallax;
        const effectiveYawOffset = this.currentYawOffset * this.params.mouseSensitivity * parallax;

        this.shaderProgram.setFloat("uPitchOffset", effectivePitchOffset);
        this.shaderProgram.setFloat("uYawOffset", effectiveYawOffset);

        // Assert Explicit Pass Pipeline State & Draw Fullscreen Quad
        gl.disable(gl.DEPTH_TEST);
        gl.depthMask(false);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

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
            this.contextManager.releaseVertexBuffer(this.quadBuffer);
            this.quadBuffer = null;
        }

        if (this.shaderProgram) {
            this.contextManager.releaseShader("galactic_cloud");
            this.shaderProgram = null;
        }

        this.gl = null;
    }

    private updateInputs(dt: number): void {
        const factor = Math.min(1.0, dt * (this.params.inputDamping ?? 4.5));
        this.currentPitchOffset += (this.targetPitchOffset - this.currentPitchOffset) * factor;
        this.currentYawOffset += (this.targetYawOffset - this.currentYawOffset) * factor;
    }

    private onPointerMove = (e: PointerEvent): void => {
        const x = (e.clientX / window.innerWidth) * 2.0 - 1.0;
        const y = (e.clientY / window.innerHeight) * 2.0 - 1.0;

        this.targetYawOffset = x * 0.5;
        this.targetPitchOffset = -y * 0.4;
    };

    private onDeviceOrientation = (e: DeviceOrientationEvent): void => {
        if (e.beta === null || e.gamma === null) return;

        const normalizedBeta = Math.max(-1.0, Math.min(1.0, (e.beta - 45.0) / 35.0));
        const normalizedGamma = Math.max(-1.0, Math.min(1.0, e.gamma / 35.0));

        this.targetPitchOffset = -normalizedBeta * 0.45;
        this.targetYawOffset = normalizedGamma * 0.55;
    };

    private attachEventListeners(): void {
        if (typeof window === "undefined") return;

        window.addEventListener("pointermove", this.onPointerMove, { passive: true });
        if (window.DeviceOrientationEvent) {
            window.addEventListener("deviceorientation", this.onDeviceOrientation, { passive: true });
        }
    }

    private detachEventListeners(): void {
        if (typeof window === "undefined") return;

        window.removeEventListener("pointermove", this.onPointerMove);
        if (window.DeviceOrientationEvent) {
            window.removeEventListener("deviceorientation", this.onDeviceOrientation);
        }
    }
}
