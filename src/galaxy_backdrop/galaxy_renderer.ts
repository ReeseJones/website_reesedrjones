import {
    DEFAULT_GALAXY_PARAMETERS,
    DEFAULT_ORB_PARAMETERS,
    DEFAULT_PINPRICK_PARAMETERS,
    GalaxyParameters,
    MOBILE_GALAXY_PARAMETERS,
    StarRenderStyle,
} from "./parameters/index";
import { generateStarBuffer } from "./galaxy_math";
import {
    createMat4,
    mat4Identity,
    mat4Multiply,
    mat4Perspective,
    mat4RotateX,
    mat4RotateY,
    mat4RotateZ,
    mat4Translate,
} from "../maths/matrix";
import galaxyPinprickVert, { GalaxyPinprickUniforms } from "./shaders/galaxy_pinprick.vert";
import galaxyPinprickFrag from "./shaders/galaxy_pinprick.frag";
import galaxyOrbVert, { GalaxyOrbUniforms } from "./shaders/galaxy_orb.vert";
import galaxyOrbFrag from "./shaders/galaxy_orb.frag";
import { CanvasDimensions, TimeInfo } from "../components/webgl_canvas/types";
import { ShaderProgram } from "../webgl/shader_program";
import { VertexBuffer } from "../webgl/vertex_buffer";
import { parseVertexLayoutFromGLSL } from "../webgl/vertex_layout";
import { WebGLContextManager } from "../webgl/context_manager";
import { OrientationInputController } from "./orientation_input";

type GalaxyShaderUniforms = GalaxyPinprickUniforms | GalaxyOrbUniforms;

/**
 * Pure WebGL2 rendering engine for the 3D spiral galaxy simulation.
 * Decoupled domain renderer focusing on transform matrix computations, particle parameters,
 * and draw call issuance. GPU shader compilation and buffer memory management are delegated
 * to WebGLContextManager via Dependency Injection.
 */
export class GalaxyRenderer {
    private gl: WebGL2RenderingContext | null = null;

    private pinprickShader: ShaderProgram<GalaxyPinprickUniforms> | null = null;
    private orbShader: ShaderProgram<GalaxyOrbUniforms> | null = null;
    private activeShader: ShaderProgram<GalaxyShaderUniforms> | null = null;
    private starBuffer: VertexBuffer | null = null;

    private params: GalaxyParameters;
    private starCount: number;

    // Cached Transformation Matrices
    private projMatrix = createMat4();
    private modelViewMatrix = createMat4();
    private viewProjMatrix = createMat4();

    // Input Parallax State
    private targetPitchOffset = 0;
    private currentPitchOffset = 0;
    private targetYawOffset = 0;
    private currentYawOffset = 0;
    private orientationController: OrientationInputController;

    private isDestroyed = false;

    constructor(
        private contextManager: WebGLContextManager,
        customParams?: Partial<GalaxyParameters>
    ) {
        const isMobile =
            typeof window !== "undefined" &&
            (window.innerWidth < 768 ||
                /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));

        this.params = {
            ...DEFAULT_GALAXY_PARAMETERS,
            ...(isMobile ? MOBILE_GALAXY_PARAMETERS : {}),
            ...customParams,
        };
        this.starCount = this.params.starCount;

        this.orientationController = new OrientationInputController({
            onUpdate: (pitch, yaw) => {
                this.targetPitchOffset = pitch;
                this.targetYawOffset = yaw;
            },
        });
    }

    /**
     * Initializes rendering dependencies and GPU buffers using the injected WebGLContextManager.
     */
    public init(gl: WebGL2RenderingContext, dims: CanvasDimensions): boolean {
        this.gl = gl;
        this.isDestroyed = false;

        // Retrieve persistent ShaderProgram instances from ContextManager
        this.pinprickShader = this.contextManager.getOrCreateShader<GalaxyPinprickUniforms>("galaxy_pinprick", {
            vertSource: galaxyPinprickVert,
            fragSource: galaxyPinprickFrag,
            label: "GalaxyPinprickShader",
        });

        this.orbShader = this.contextManager.getOrCreateShader<GalaxyOrbUniforms>("galaxy_orb", {
            vertSource: galaxyOrbVert,
            fragSource: galaxyOrbFrag,
            label: "GalaxyOrbShader",
        });

        this.activeShader =
            this.params.style === "orb" ? this.orbShader : this.pinprickShader;
        this.contextManager.useShader(this.activeShader);

        // Request managed VertexBuffer resource
        if (!this.starBuffer) {
            const layout = parseVertexLayoutFromGLSL(galaxyPinprickVert);
            this.starBuffer = this.contextManager.createVertexBuffer(layout);
        }
        this.starBuffer.setData(generateStarBuffer(this.params));

        this.uploadStaticUniforms();
        this.attachEventListeners();
        this.updateProjection(gl, dims);

        return true;
    }

    public uploadStaticUniforms(): void {
        if (!this.activeShader) return;

        this.activeShader.setUniforms({
            u_rotationSpeed: this.params.rotationSpeed,
            u_differentialSpeed: this.params.differentialSpeed,
            u_driftSpeed: this.params.driftSpeed,
            u_driftAmplitude: this.params.driftAmplitude,
            u_pointScale: this.params.pointScale,
            u_minPointSize: this.params.minPointSize,
            u_maxPointSize: this.params.maxPointSize,
            u_nearFadeDistance: this.params.nearFadeDistance,
            u_coreColor: this.params.coreColor,
            u_coreBlazeColor: this.params.coreBlazeColor,
            u_armInnerColor: this.params.armInnerColor,
            u_armOuterColor: this.params.armOuterColor,
            u_accentColor: this.params.accentColor,
            u_coreGlowBoost: this.params.coreGlowBoost,
        });
    }

    /**
     * Updates viewport and projection dimensions when canvas resolution changes.
     */
    public updateProjection(gl: WebGL2RenderingContext, dims: CanvasDimensions): void {
        if (!this.gl || this.isDestroyed) return;
        gl.viewport(0, 0, dims.width, dims.height);
    }

    /**
     * Executes a single frame draw pass for the galaxy simulation.
     * Asserts explicit pass state ownership (blending and depth settings) prior to drawing.
     */
    public renderFrame(
        gl: WebGL2RenderingContext,
        timeInfo: TimeInfo,
        dims: CanvasDimensions
    ): void {
        if (!gl || !this.activeShader || !this.starBuffer || this.isDestroyed) return;

        this.updateInputs(timeInfo.dt);

        const width = dims.width;
        const height = dims.height;
        const aspect = dims.aspect;

        // 1. Perspective Camera Projection
        mat4Perspective(
            this.projMatrix,
            this.params.fov,
            aspect,
            this.params.nearPlane,
            this.params.farPlane
        );

        // 2. 3D Model-View Transformation
        mat4Identity(this.modelViewMatrix);

        const aspectScale = Math.min(1.0, aspect / 1.5);
        const offsetX = this.params.centerOffsetX * aspectScale;
        const offsetY = this.params.centerOffsetY;

        mat4Translate(
            this.modelViewMatrix,
            this.modelViewMatrix,
            offsetX,
            offsetY,
            -this.params.cameraDistance
        );

        const pitch =
            this.params.pitchAngle +
            this.currentPitchOffset * this.params.mouseSensitivity;
        const yaw =
            this.params.yawAngle +
            this.currentYawOffset * this.params.mouseSensitivity;
        const roll = this.params.rollAngle;

        mat4RotateX(this.modelViewMatrix, this.modelViewMatrix, pitch);
        mat4RotateY(this.modelViewMatrix, this.modelViewMatrix, yaw);
        mat4RotateZ(this.modelViewMatrix, this.modelViewMatrix, roll);

        mat4Multiply(
            this.viewProjMatrix,
            this.projMatrix,
            this.modelViewMatrix
        );

        // 3. Upload Dynamic Frame Uniforms with compile-time type safety
        this.activeShader.setUniforms({
            u_viewProjectionMatrix: this.viewProjMatrix,
            u_modelViewMatrix: this.modelViewMatrix,
            u_time: timeInfo.time,
            u_viewportHeight: height,
        });

        // 4. Assert Explicit Pass Pipeline State & Draw Stars with Additive Blending
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE);
        gl.disable(gl.DEPTH_TEST);
        gl.depthMask(false);

        this.starBuffer.bind();
        gl.drawArrays(gl.POINTS, 0, this.starCount);
    }

    /**
     * Context loss callback invoked when WebGL context is lost.
     */
    public onContextLost(): void {
        this.gl = null;
    }

    /**
     * Context restoration callback invoked after WebGLContextManager restores GPU resources.
     */
    public onContextRestored(
        gl: WebGL2RenderingContext,
        dims: CanvasDimensions
    ): void {
        this.gl = gl;
        this.uploadStaticUniforms();
        this.updateProjection(gl, dims);
    }

    /**
     * Switch dynamically between 'pinprick' and 'orb' styles.
     */
    public setStyle(style: StarRenderStyle): void {
        if (!this.gl || this.isDestroyed || this.params.style === style) return;

        const defaults =
            style === "orb"
                ? DEFAULT_ORB_PARAMETERS
                : DEFAULT_PINPRICK_PARAMETERS;

        this.params.style = style;
        this.params.minPointSize = defaults.minPointSize;
        this.params.maxPointSize = defaults.maxPointSize;
        this.params.pointScale = defaults.pointScale;
        this.params.coreGlowBoost = defaults.coreGlowBoost;
        this.params.nearFadeDistance = defaults.nearFadeDistance;

        this.activeShader =
            style === "orb" ? this.orbShader : this.pinprickShader;

        if (this.activeShader) {
            this.contextManager.useShader(this.activeShader);
            this.uploadStaticUniforms();
        }
    }

    public getStyle(): StarRenderStyle {
        return this.params.style;
    }

    /**
     * Dynamically update parameters in real-time.
     */
    public updateParameters(newParams: Partial<GalaxyParameters>): void {
        if (!this.gl || this.isDestroyed) return;

        if (newParams.style && newParams.style !== this.params.style) {
            this.setStyle(newParams.style);
        }

        const needsGeometryRebuild =
            (newParams.starCount !== undefined &&
                newParams.starCount !== this.params.starCount) ||
            (newParams.armCount !== undefined &&
                newParams.armCount !== this.params.armCount) ||
            (newParams.armWinding !== undefined &&
                newParams.armWinding !== this.params.armWinding) ||
            (newParams.armDispersion !== undefined &&
                newParams.armDispersion !== this.params.armDispersion) ||
            (newParams.spurFrequency !== undefined &&
                newParams.spurFrequency !== this.params.spurFrequency) ||
            (newParams.coreRadius !== undefined &&
                newParams.coreRadius !== this.params.coreRadius) ||
            (newParams.diskRadius !== undefined &&
                newParams.diskRadius !== this.params.diskRadius) ||
            (newParams.diskThickness !== undefined &&
                newParams.diskThickness !== this.params.diskThickness) ||
            (newParams.coreDensityRatio !== undefined &&
                newParams.coreDensityRatio !== this.params.coreDensityRatio);

        Object.assign(this.params, newParams);

        if (needsGeometryRebuild) {
            this.rebuildStarBuffer();
        }

        this.uploadStaticUniforms();
    }

    public getParameters(): GalaxyParameters {
        return { ...this.params };
    }

    public destroy(): void {
        this.isDestroyed = true;
        this.detachEventListeners();

        if (this.starBuffer) {
            this.contextManager.releaseVertexBuffer(this.starBuffer);
            this.starBuffer = null;
        }

        if (this.pinprickShader) {
            this.contextManager.releaseShader("galaxy_pinprick");
            this.pinprickShader = null;
        }
        if (this.orbShader) {
            this.contextManager.releaseShader("galaxy_orb");
            this.orbShader = null;
        }
        this.activeShader = null;

        this.gl = null;
    }

    private rebuildStarBuffer(): void {
        if (!this.gl || !this.starBuffer) return;
        this.starCount = this.params.starCount;
        const starData = generateStarBuffer(this.params);
        this.starBuffer.setData(starData);
    }

    private updateInputs(dt: number): void {
        const decay = 1.0 - Math.exp(-this.params.inputDamping * dt);
        this.currentPitchOffset +=
            (this.targetPitchOffset - this.currentPitchOffset) * decay;
        this.currentYawOffset +=
            (this.targetYawOffset - this.currentYawOffset) * decay;
    }

    private attachEventListeners(): void {
        this.orientationController.attach();
    }

    private detachEventListeners(): void {
        this.orientationController.detach();
    }
}
