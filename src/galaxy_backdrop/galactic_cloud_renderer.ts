import { GalaxyParameters, DEFAULT_GALAXY_PARAMETERS, MOBILE_GALAXY_PARAMETERS } from "./parameters/index";
import { GALACTIC_CLOUD_FRAGMENT_SHADER, GALACTIC_CLOUD_VERTEX_SHADER } from "./galactic_cloud_shaders";
import { CanvasDimensions, TimeInfo } from "../components/webgl_canvas/types";

/**
 * Pure WebGL2 rendering engine for the Celestial Horizon background pass.
 * Draws a fullscreen quad using multi-stop horizon color gradients.
 * Follows WebGL Rendering Guidelines: minimizes draw calls, updates static uniforms on parameter change only,
 * and avoids redundant VAO unbinding state switches.
 */
export class GalacticCloudRenderer {
    private gl: WebGL2RenderingContext | null = null;
    private program: WebGLProgram | null = null;
    private vao: WebGLVertexArrayObject | null = null;
    private vbo: WebGLBuffer | null = null;

    private params: GalaxyParameters;
    private isStaticUniformsDirty = true;

    // Uniform Locations
    private uAspectLoc: WebGLUniformLocation | null = null;
    private uFovScaleLoc: WebGLUniformLocation | null = null;
    private uPitchLoc: WebGLUniformLocation | null = null;
    private uYawLoc: WebGLUniformLocation | null = null;
    private uRollLoc: WebGLUniformLocation | null = null;
    private uPitchOffsetLoc: WebGLUniformLocation | null = null;
    private uYawOffsetLoc: WebGLUniformLocation | null = null;

    private uHorizonIntensityLoc: WebGLUniformLocation | null = null;
    private uHorizonThicknessLoc: WebGLUniformLocation | null = null;
    private uHorizonColorCenterLoc: WebGLUniformLocation | null = null;
    private uHorizonColorOuterLoc: WebGLUniformLocation | null = null;

    // Input Parallax State
    private targetPitchOffset = 0;
    private currentPitchOffset = 0;
    private targetYawOffset = 0;
    private currentYawOffset = 0;

    private isDestroyed = false;

    constructor(customParams?: Partial<GalaxyParameters>) {
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
        this.isStaticUniformsDirty = true;

        const program = this.createProgram(gl, GALACTIC_CLOUD_VERTEX_SHADER, GALACTIC_CLOUD_FRAGMENT_SHADER);
        if (!program) {
            return false;
        }
        this.program = program;
        gl.useProgram(program);

        this.cacheUniformLocations(gl, program);
        this.initQuadBuffer(gl);
        this.attachEventListeners();
        this.updateProjection(gl, dims);

        return true;
    }

    public updateProjection(gl: WebGL2RenderingContext, dims: CanvasDimensions): void {
        if (!this.gl || this.isDestroyed) return;
        gl.viewport(0, 0, dims.width, dims.height);
    }

    public renderFrame(
        gl: WebGL2RenderingContext,
        timeInfo: TimeInfo,
        dims: CanvasDimensions
    ): void {
        if (!gl || !this.program || !this.vao || this.isDestroyed || !this.params.cloudEnabled) return;

        this.updateInputs(timeInfo.dt);

        gl.useProgram(this.program);
        gl.bindVertexArray(this.vao);

        // Calculate FOV scale factor for view-ray reconstruction
        const fovRad = (this.params.fov * Math.PI) / 180.0;
        const fovScale = Math.tan(fovRad * 0.5);

        // 1. Upload Per-Frame Dynamic Uniforms Only
        gl.uniform1f(this.uAspectLoc, dims.aspect);
        gl.uniform1f(this.uFovScaleLoc, fovScale);
        gl.uniform1f(this.uPitchLoc, this.params.pitchAngle);
        gl.uniform1f(this.uYawLoc, this.params.yawAngle);
        gl.uniform1f(this.uRollLoc, this.params.rollAngle);

        const parallax = this.params.cloudParallaxFactor ?? 0.25;
        const effectivePitchOffset = this.currentPitchOffset * this.params.mouseSensitivity * parallax;
        const effectiveYawOffset = this.currentYawOffset * this.params.mouseSensitivity * parallax;

        gl.uniform1f(this.uPitchOffsetLoc, effectivePitchOffset);
        gl.uniform1f(this.uYawOffsetLoc, effectiveYawOffset);

        // 2. Smart Uniform Management: Only upload static configuration uniforms on parameter change
        if (this.isStaticUniformsDirty) {
            gl.uniform1f(this.uHorizonIntensityLoc, this.params.horizonIntensity);
            gl.uniform1f(this.uHorizonThicknessLoc, this.params.horizonThickness);

            const centerColor = this.params.horizonColorCenter ?? [1.0, 0.84, 0.66];
            const outerColor = this.params.horizonColorOuter ?? [0.15, 0.25, 0.85];

            gl.uniform3fv(this.uHorizonColorCenterLoc, centerColor);
            gl.uniform3fv(this.uHorizonColorOuterLoc, outerColor);

            this.isStaticUniformsDirty = false;
        }

        // 3. Single Draw Call (Fullscreen Quad)
        gl.disable(gl.DEPTH_TEST);
        gl.depthMask(false);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        // Note per WebGL Guidelines: bindVertexArray(null) is intentionally omitted at end of frame
    }

    public updateParameters(newParams: Partial<GalaxyParameters>): void {
        if (this.isDestroyed) return;
        this.params = {
            ...this.params,
            ...newParams,
        };
        this.isStaticUniformsDirty = true;
    }

    public onContextLost(): void {
        this.gl = null;
        this.program = null;
        this.vao = null;
        this.vbo = null;
    }

    public onContextRestored(gl: WebGL2RenderingContext, dims: CanvasDimensions): void {
        this.init(gl, dims);
    }

    public destroy(): void {
        this.isDestroyed = true;
        this.detachEventListeners();

        if (this.gl) {
            if (this.vbo) this.gl.deleteBuffer(this.vbo);
            if (this.vao) this.gl.deleteVertexArray(this.vao);
            if (this.program) this.gl.deleteProgram(this.program);
        }

        this.gl = null;
        this.program = null;
        this.vao = null;
        this.vbo = null;
    }

    private initQuadBuffer(gl: WebGL2RenderingContext): void {
        this.vao = gl.createVertexArray();
        this.vbo = gl.createBuffer();

        gl.bindVertexArray(this.vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);

        // Triangle strip unit quad positions: [ -1,-1,  1,-1,  -1,1,  1,1 ]
        const quadPositions = new Float32Array([
            -1.0, -1.0,
             1.0, -1.0,
            -1.0,  1.0,
             1.0,  1.0,
        ]);

        gl.bufferData(gl.ARRAY_BUFFER, quadPositions, gl.STATIC_DRAW);

        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0);
    }

    private cacheUniformLocations(gl: WebGL2RenderingContext, program: WebGLProgram): void {
        this.uAspectLoc = gl.getUniformLocation(program, "uAspect");
        this.uFovScaleLoc = gl.getUniformLocation(program, "uFovScale");
        this.uPitchLoc = gl.getUniformLocation(program, "uPitch");
        this.uYawLoc = gl.getUniformLocation(program, "uYaw");
        this.uRollLoc = gl.getUniformLocation(program, "uRoll");
        this.uPitchOffsetLoc = gl.getUniformLocation(program, "uPitchOffset");
        this.uYawOffsetLoc = gl.getUniformLocation(program, "uYawOffset");

        this.uHorizonIntensityLoc = gl.getUniformLocation(program, "uHorizonIntensity");
        this.uHorizonThicknessLoc = gl.getUniformLocation(program, "uHorizonThickness");
        this.uHorizonColorCenterLoc = gl.getUniformLocation(program, "uHorizonColorCenter");
        this.uHorizonColorOuterLoc = gl.getUniformLocation(program, "uHorizonColorOuter");
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
            console.error("Unable to link Galactic Cloud program:", gl.getProgramInfoLog(program));
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
                `Shader compilation error (${type === gl.VERTEX_SHADER ? "VERTEX" : "FRAGMENT"}):`,
                gl.getShaderInfoLog(shader)
            );
            gl.deleteShader(shader);
            return null;
        }

        return shader;
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
