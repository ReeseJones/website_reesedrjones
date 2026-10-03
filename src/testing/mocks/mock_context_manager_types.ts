import type { Mock } from "vitest";
import type { IWebGLContextManager } from "../../webgl/core/context_manager_types";
import type { PipelineState } from "../../scene/materials/material_types";
import type { VertexLayoutSpec } from "../../webgl/geometry/vertex_layout_types";
import type { VertexBuffer } from "../../webgl/geometry/vertex_buffer";
import type { ShaderKey } from "../../webgl/shaders/shader_types";
import type { ShaderProgramOptions } from "../../webgl/shaders/shader_program_types";
import type { ShaderProgram } from "../../webgl/shaders/shader_program";
import type { IContextSubsystem, SubsystemDiagnostics } from "../../webgl/core/subsystem_types";

/**
 * Type declaration for mock WebGLContextManager test fixture with spy functions.
 */
export interface IMockWebGLContextManager extends IWebGLContextManager {
    setContext: Mock<(gl: WebGL2RenderingContext) => void>;
    getContext: Mock<() => WebGL2RenderingContext | null>;
    getCurrentProgram: Mock<() => WebGLProgram | null>;
    getCurrentShader: Mock<() => ShaderProgram<never> | null>;
    useShader: Mock<(shader: ShaderProgram<never> | null) => void>;
    useProgram: Mock<(program: WebGLProgram | null) => void>;
    getOrCreateShader: Mock<(key: ShaderKey, options: ShaderProgramOptions) => ShaderProgram<never>>;
    getShader: Mock<(key: ShaderKey) => ShaderProgram<never> | null>;
    releaseShader: Mock<(keyOrInstance: ShaderKey | ShaderProgram<never>) => void>;
    createVertexBuffer: Mock<(layout: VertexLayoutSpec) => VertexBuffer>;
    releaseVertexBuffer: Mock<(buffer: VertexBuffer) => void>;
    applyPipelineState: Mock<(state: PipelineState) => void>;
    resetPipelineState: Mock<() => void>;
    setDepthMask: Mock<(enabled: boolean) => void>;
    bindTexture: Mock<(unit: number, texture: WebGLTexture | null) => void>;
    bindCubeTexture: Mock<(unit: number, texture: WebGLTexture | null) => void>;
    getDefaultWhiteTexture: Mock<() => WebGLTexture | null>;
    getDefaultBlackCubeTexture: Mock<() => WebGLTexture | null>;
    registerSubsystem: Mock<<T extends IContextSubsystem>(subsystem: T) => T>;
    getSubsystem: Mock<<T extends IContextSubsystem>(name: string) => T | null>;
    getDiagnostics: Mock<() => Record<string, SubsystemDiagnostics>>;
    handleContextLost: Mock<() => void>;
    handleContextRestored: Mock<(newGl: WebGL2RenderingContext) => void>;
    destroy: Mock<() => void>;
}
