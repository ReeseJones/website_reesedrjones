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
import {
    GALAXY_ORB_FRAGMENT_SHADER,
    GALAXY_ORB_VERTEX_SHADER,
    GALAXY_PINPRICK_FRAGMENT_SHADER,
    GALAXY_PINPRICK_VERTEX_SHADER,
} from "./galaxy_shaders";
import { CanvasDimensions, TimeInfo } from "../components/webgl_canvas/types";
import { STAR_VERTEX_LAYOUT, GALAXY_UNIFORM_DECLARATIONS } from "./galaxy_layout";
import { ShaderProgram } from "../webgl/shader_program";
import { VertexBuffer } from "../webgl/vertex_buffer";
import { WebGLContextManager } from "../webgl/context_manager";

/**
 * Pure WebGL2 rendering engine for the 3D spiral galaxy simulation.
 * Decoupled domain renderer focusing on transform matrix computations, particle parameters,
 * and draw call issuance. GPU shader compilation and buffer memory management are delegated
 * to WebGLContextManager via Dependency Injection.
 */
export class GalaxyRenderer {
    private gl: WebGL2RenderingContext | null = null;
    private contextManager: WebGLContextManager;

    private pinprickShader: ShaderProgram | null = null;
    private orbShader: ShaderProgram | null = null;
    private activeShader: ShaderProgram | null = null;
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

    private isDestroyed = false;

    constructor(
        customParams?: Partial<GalaxyParameters>,
        contextManager?: WebGLContextManager
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
        this.contextManager = contextManager ?? new WebGLContextManager();
    }

    /**
     * Initializes rendering dependencies and GPU buffers using WebGLContextManager.
     */
    public init(gl: WebGL2RenderingContext, dims: CanvasDimensions): boolean {
        this.gl = gl;
        this.isDestroyed = false;
        this.contextManager.setContext(gl);

        // Retrieve persistent ShaderProgram instances from ContextManager
        this.pinprickShader = this.contextManager.getOrCreateShader("galaxy_pinprick", {
            vertSource: GALAXY_PINPRICK_VERTEX_SHADER,
            fragSource: GALAXY_PINPRICK_FRAGMENT_SHADER,
            declaredUniforms: GALAXY_UNIFORM_DECLARATIONS,
            label: "GalaxyPinprickShader",
        });

        this.orbShader = this.contextManager.getOrCreateShader("galaxy_orb", {
            vertSource: GALAXY_ORB_VERTEX_SHADER,
            fragSource: GALAXY_ORB_FRAGMENT_SHADER,
            declaredUniforms: GALAXY_UNIFORM_DECLARATIONS,
            label: "GalaxyOrbShader",
        });

        this.activeShader =
            this.params.style === "orb" ? this.orbShader : this.pinprickShader;
        this.activeShader.use();

        // Request managed VertexBuffer resource
        if (!this.starBuffer) {
            this.starBuffer = this.contextManager.createVertexBuffer(STAR_VERTEX_LAYOUT);
        }
        this.starBuffer.setData(generateStarBuffer(this.params));

        this.uploadStaticUniforms();

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE);
        gl.disable(gl.DEPTH_TEST);
        gl.depthMask(false);

        this.attachEventListeners();
        this.updateProjection(gl, dims);

        return true;
    }

    public uploadStaticUniforms(): void {
        if (!this.activeShader) return;
        this.activeShader.use();

        this.activeShader.setFloat("u_rotationSpeed", this.params.rotationSpeed);
        this.activeShader.setFloat("u_differentialSpeed", this.params.differentialSpeed);
        this.activeShader.setFloat("u_driftSpeed", this.params.driftSpeed);
        this.activeShader.setFloat("u_driftAmplitude", this.params.driftAmplitude);
        this.activeShader.setFloat("u_pointScale", this.params.pointScale);
        this.activeShader.setFloat("u_minPointSize", this.params.minPointSize);
        this.activeShader.setFloat("u_maxPointSize", this.params.maxPointSize);
        this.activeShader.setFloat("u_nearFadeDistance", this.params.nearFadeDistance);

        this.activeShader.setVec3("u_coreColor", this.params.coreColor);
        this.activeShader.setVec3("u_coreBlazeColor", this.params.coreBlazeColor);
        this.activeShader.setVec3("u_armInnerColor", this.params.armInnerColor);
        this.activeShader.setVec3("u_armOuterColor", this.params.armOuterColor);
        this.activeShader.setVec3("u_accentColor", this.params.accentColor);
        this.activeShader.setFloat("u_coreGlowBoost", this.params.coreGlowBoost);
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

        // 3. Upload Dynamic Frame Uniforms
        this.activeShader.use();
        this.activeShader.setMat4("u_viewProjectionMatrix", this.viewProjMatrix);
        this.activeShader.setMat4("u_modelViewMatrix", this.modelViewMatrix);
        this.activeShader.setFloat("u_time", timeInfo.time);
        this.activeShader.setFloat("u_viewportHeight", height);

        // 4. Draw Stars with Additive Blending
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE);
        this.starBuffer.bind();
        gl.drawArrays(gl.POINTS, 0, this.starCount);
    }

    /**
     * Delegates context loss handling to WebGLContextManager.
     */
    public onContextLost(): void {
        this.gl = null;
        this.contextManager.handleContextLost();
    }

    /**
     * Delegates automated 2-phase context restoration to WebGLContextManager.
     */
    public onContextRestored(
        gl: WebGL2RenderingContext,
        dims: CanvasDimensions
    ): void {
        this.gl = gl;
        this.contextManager.handleContextRestored(gl);
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
            this.activeShader.use();
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

    private onPointerMove = (e: PointerEvent): void => {
        const x = (e.clientX / window.innerWidth) * 2.0 - 1.0;
        const y = (e.clientY / window.innerHeight) * 2.0 - 1.0;

        this.targetYawOffset = x * 0.5;
        this.targetPitchOffset = -y * 0.4;
    };

    private onDeviceOrientation = (e: DeviceOrientationEvent): void => {
        if (e.beta === null || e.gamma === null) return;

        const normalizedBeta = Math.max(
            -1.0,
            Math.min(1.0, (e.beta - 45.0) / 35.0)
        );
        const normalizedGamma = Math.max(-1.0, Math.min(1.0, e.gamma / 35.0));

        this.targetPitchOffset = -normalizedBeta * 0.45;
        this.targetYawOffset = normalizedGamma * 0.55;
    };

    private attachEventListeners(): void {
        if (typeof window === "undefined") return;

        window.addEventListener("pointermove", this.onPointerMove, {
            passive: true,
        });

        if (window.DeviceOrientationEvent) {
            window.addEventListener(
                "deviceorientation",
                this.onDeviceOrientation,
                { passive: true }
            );
        }
    }

    private detachEventListeners(): void {
        if (typeof window === "undefined") return;

        window.removeEventListener("pointermove", this.onPointerMove);
        window.removeEventListener(
            "deviceorientation",
            this.onDeviceOrientation
        );
    }
}
