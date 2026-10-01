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

/**
 * Pure WebGL2 rendering engine for the 3D spiral galaxy simulation.
 * Manages GPU buffers, VAO setup, GLSL ES 3.00 shader programs, camera matrix calculations,
 * and point sprite drawing passes. Context lifecycle and DOM execution are managed by WebGLCanvas.
 */
export class GalaxyRenderer {
    private gl: WebGL2RenderingContext | null = null;
    private program: WebGLProgram | null = null;
    private vao: WebGLVertexArrayObject | null = null;
    private vbo: WebGLBuffer | null = null;

    private params: GalaxyParameters;
    private starCount: number;

    // Uniform Locations
    private uViewProjLoc: WebGLUniformLocation | null = null;
    private uModelViewLoc: WebGLUniformLocation | null = null;
    private uTimeLoc: WebGLUniformLocation | null = null;
    private uRotationSpeedLoc: WebGLUniformLocation | null = null;
    private uDifferentialSpeedLoc: WebGLUniformLocation | null = null;
    private uDriftSpeedLoc: WebGLUniformLocation | null = null;
    private uDriftAmplitudeLoc: WebGLUniformLocation | null = null;
    private uPointScaleLoc: WebGLUniformLocation | null = null;
    private uMinPointSizeLoc: WebGLUniformLocation | null = null;
    private uMaxPointSizeLoc: WebGLUniformLocation | null = null;
    private uViewportHeightLoc: WebGLUniformLocation | null = null;
    private uNearFadeDistLoc: WebGLUniformLocation | null = null;

    private uCoreColorLoc: WebGLUniformLocation | null = null;
    private uCoreBlazeColorLoc: WebGLUniformLocation | null = null;
    private uArmInnerColorLoc: WebGLUniformLocation | null = null;
    private uArmOuterColorLoc: WebGLUniformLocation | null = null;
    private uAccentColorLoc: WebGLUniformLocation | null = null;
    private uCoreGlowBoostLoc: WebGLUniformLocation | null = null;

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

    constructor(customParams?: Partial<GalaxyParameters>) {
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
    }

    /**
     * Initializes shader programs, VAO/VBO buffers, and blending modes with the provided WebGL2 context.
     */
    public init(gl: WebGL2RenderingContext, dims: CanvasDimensions): boolean {
        this.gl = gl;
        this.isDestroyed = false;

        const vertSource =
            this.params.style === "orb"
                ? GALAXY_ORB_VERTEX_SHADER
                : GALAXY_PINPRICK_VERTEX_SHADER;
        const fragSource =
            this.params.style === "orb"
                ? GALAXY_ORB_FRAGMENT_SHADER
                : GALAXY_PINPRICK_FRAGMENT_SHADER;

        const program = this.createProgram(gl, vertSource, fragSource);
        if (!program) {
            return false;
        }
        this.program = program;
        gl.useProgram(program);

        this.cacheUniformLocations(gl, program);
        this.initializeStarBuffers(gl);

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE);
        gl.disable(gl.DEPTH_TEST);
        gl.depthMask(false);

        this.attachEventListeners();
        this.updateProjection(gl, dims);

        return true;
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
        if (!gl || !this.program || !this.vao || this.isDestroyed) return;

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
        gl.useProgram(this.program);
        gl.uniformMatrix4fv(this.uViewProjLoc, false, this.viewProjMatrix);
        gl.uniformMatrix4fv(this.uModelViewLoc, false, this.modelViewMatrix);
        gl.uniform1f(this.uTimeLoc, timeInfo.time);
        gl.uniform1f(this.uViewportHeightLoc, height);

        // 4. Draw Stars with Additive Blending
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE);
        gl.bindVertexArray(this.vao);
        gl.drawArrays(gl.POINTS, 0, this.starCount);
    }

    /**
     * Clears GL object references on WebGL context loss.
     */
    public onContextLost(): void {
        this.gl = null;
        this.program = null;
        this.vao = null;
        this.vbo = null;
    }

    /**
     * Re-initializes GPU resources when WebGL context is restored.
     */
    public onContextRestored(
        gl: WebGL2RenderingContext,
        dims: CanvasDimensions
    ): void {
        this.init(gl, dims);
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

        const gl = this.gl;
        const vertSource =
            style === "orb"
                ? GALAXY_ORB_VERTEX_SHADER
                : GALAXY_PINPRICK_VERTEX_SHADER;
        const fragSource =
            style === "orb"
                ? GALAXY_ORB_FRAGMENT_SHADER
                : GALAXY_PINPRICK_FRAGMENT_SHADER;

        const newProgram = this.createProgram(gl, vertSource, fragSource);
        if (!newProgram) return;

        if (this.program) {
            gl.deleteProgram(this.program);
        }
        this.program = newProgram;
        gl.useProgram(newProgram);
        this.cacheUniformLocations(gl, newProgram);
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

        if (this.gl) {
            if (this.vbo) this.gl.deleteBuffer(this.vbo);
            if (this.vao) this.gl.deleteVertexArray(this.vao);
            if (this.program) this.gl.deleteProgram(this.program);
            this.gl = null;
        }
    }

    private updateInputs(dt: number): void {
        const decay = 1.0 - Math.exp(-this.params.inputDamping * dt);
        this.currentPitchOffset +=
            (this.targetPitchOffset - this.currentPitchOffset) * decay;
        this.currentYawOffset +=
            (this.targetYawOffset - this.currentYawOffset) * decay;
    }

    private cacheUniformLocations(
        gl: WebGL2RenderingContext,
        program: WebGLProgram
    ): void {
        this.uViewProjLoc = gl.getUniformLocation(program, "u_viewProjectionMatrix");
        this.uModelViewLoc = gl.getUniformLocation(program, "u_modelViewMatrix");
        this.uTimeLoc = gl.getUniformLocation(program, "u_time");
        this.uRotationSpeedLoc = gl.getUniformLocation(program, "u_rotationSpeed");
        this.uDifferentialSpeedLoc = gl.getUniformLocation(
            program,
            "u_differentialSpeed"
        );
        this.uDriftSpeedLoc = gl.getUniformLocation(program, "u_driftSpeed");
        this.uDriftAmplitudeLoc = gl.getUniformLocation(
            program,
            "u_driftAmplitude"
        );
        this.uPointScaleLoc = gl.getUniformLocation(program, "u_pointScale");
        this.uMinPointSizeLoc = gl.getUniformLocation(program, "u_minPointSize");
        this.uMaxPointSizeLoc = gl.getUniformLocation(program, "u_maxPointSize");
        this.uViewportHeightLoc = gl.getUniformLocation(
            program,
            "u_viewportHeight"
        );
        this.uNearFadeDistLoc = gl.getUniformLocation(
            program,
            "u_nearFadeDistance"
        );

        this.uCoreColorLoc = gl.getUniformLocation(program, "u_coreColor");
        this.uCoreBlazeColorLoc = gl.getUniformLocation(
            program,
            "u_coreBlazeColor"
        );
        this.uArmInnerColorLoc = gl.getUniformLocation(program, "u_armInnerColor");
        this.uArmOuterColorLoc = gl.getUniformLocation(program, "u_armOuterColor");
        this.uAccentColorLoc = gl.getUniformLocation(program, "u_accentColor");
        this.uCoreGlowBoostLoc = gl.getUniformLocation(
            program,
            "u_coreGlowBoost"
        );

        this.uploadStaticUniforms();
    }

    private uploadStaticUniforms(): void {
        const gl = this.gl;
        if (!gl || !this.program) return;

        gl.useProgram(this.program);

        // Upload static scalar parameters
        if (this.uRotationSpeedLoc) {
            gl.uniform1f(this.uRotationSpeedLoc, this.params.rotationSpeed);
        }
        if (this.uDifferentialSpeedLoc) {
            gl.uniform1f(this.uDifferentialSpeedLoc, this.params.differentialSpeed);
        }
        if (this.uDriftSpeedLoc) {
            gl.uniform1f(this.uDriftSpeedLoc, this.params.driftSpeed);
        }
        if (this.uDriftAmplitudeLoc) {
            gl.uniform1f(this.uDriftAmplitudeLoc, this.params.driftAmplitude);
        }
        if (this.uPointScaleLoc) {
            gl.uniform1f(this.uPointScaleLoc, this.params.pointScale);
        }
        if (this.uMinPointSizeLoc) {
            gl.uniform1f(this.uMinPointSizeLoc, this.params.minPointSize);
        }
        if (this.uMaxPointSizeLoc) {
            gl.uniform1f(this.uMaxPointSizeLoc, this.params.maxPointSize);
        }
        if (this.uNearFadeDistLoc) {
            gl.uniform1f(this.uNearFadeDistLoc, this.params.nearFadeDistance);
        }

        // Upload color parameters
        if (this.uCoreColorLoc) {
            gl.uniform3fv(this.uCoreColorLoc, this.params.coreColor);
        }
        if (this.uCoreBlazeColorLoc) {
            gl.uniform3fv(this.uCoreBlazeColorLoc, this.params.coreBlazeColor);
        }
        if (this.uArmInnerColorLoc) {
            gl.uniform3fv(this.uArmInnerColorLoc, this.params.armInnerColor);
        }
        if (this.uArmOuterColorLoc) {
            gl.uniform3fv(this.uArmOuterColorLoc, this.params.armOuterColor);
        }
        if (this.uAccentColorLoc) {
            gl.uniform3fv(this.uAccentColorLoc, this.params.accentColor);
        }
        if (this.uCoreGlowBoostLoc) {
            gl.uniform1f(this.uCoreGlowBoostLoc, this.params.coreGlowBoost);
        }
    }

    private rebuildStarBuffer(): void {
        if (!this.gl || !this.vbo) return;
        const gl = this.gl;
        this.starCount = this.params.starCount;
        const starData = generateStarBuffer(this.params);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bufferData(gl.ARRAY_BUFFER, starData, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }

    private initializeStarBuffers(gl: WebGL2RenderingContext): void {
        const starData = generateStarBuffer(this.params);

        this.vao = gl.createVertexArray();
        this.vbo = gl.createBuffer();

        gl.bindVertexArray(this.vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bufferData(gl.ARRAY_BUFFER, starData, gl.STATIC_DRAW);

        const stride = 6 * Float32Array.BYTES_PER_ELEMENT;

        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 1, gl.FLOAT, false, stride, 0);

        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(
            1,
            1,
            gl.FLOAT,
            false,
            stride,
            1 * Float32Array.BYTES_PER_ELEMENT
        );

        gl.enableVertexAttribArray(2);
        gl.vertexAttribPointer(
            2,
            1,
            gl.FLOAT,
            false,
            stride,
            2 * Float32Array.BYTES_PER_ELEMENT
        );

        gl.enableVertexAttribArray(3);
        gl.vertexAttribPointer(
            3,
            1,
            gl.FLOAT,
            false,
            stride,
            3 * Float32Array.BYTES_PER_ELEMENT
        );

        gl.enableVertexAttribArray(4);
        gl.vertexAttribPointer(
            4,
            1,
            gl.FLOAT,
            false,
            stride,
            4 * Float32Array.BYTES_PER_ELEMENT
        );

        gl.enableVertexAttribArray(5);
        gl.vertexAttribPointer(
            5,
            1,
            gl.FLOAT,
            false,
            stride,
            5 * Float32Array.BYTES_PER_ELEMENT
        );

        gl.bindVertexArray(null);
    }

    private createProgram(
        gl: WebGL2RenderingContext,
        vsSource: string,
        fsSource: string
    ): WebGLProgram | null {
        const vs = this.compileShader(gl, gl.VERTEX_SHADER, vsSource);
        const fs = this.compileShader(gl, gl.FRAGMENT_SHADER, fsSource);
        if (!vs || !fs) return null;

        const program = gl.createProgram();
        if (!program) return null;

        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);

        gl.deleteShader(vs);
        gl.deleteShader(fs);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error(
                "Unable to link WebGL2 program:",
                gl.getProgramInfoLog(program)
            );
            gl.deleteProgram(program);
            return null;
        }

        return program;
    }

    private compileShader(
        gl: WebGL2RenderingContext,
        type: number,
        source: string
    ): WebGLShader | null {
        const shader = gl.createShader(type);
        if (!shader) return null;

        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error(
                `Shader compilation error (${
                    type === gl.VERTEX_SHADER ? "VERTEX" : "FRAGMENT"
                }):`,
                gl.getShaderInfoLog(shader)
            );
            gl.deleteShader(shader);
            return null;
        }

        return shader;
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
