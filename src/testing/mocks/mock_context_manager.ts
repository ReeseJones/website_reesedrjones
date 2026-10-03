import { vi } from "vitest";
import type { IMockWebGLContextManager } from "./mock_context_manager_types";
import type { IShaderManager } from "../../webgl/shaders/shader_manager_types";
import type { IGeometryManager } from "../../webgl/geometry/geometry_manager_types";
import type { ITextureManager } from "../../webgl/textures/texture_manager_types";
import type { VertexBuffer } from "../../webgl/geometry/vertex_buffer";
import type { ShaderProgram } from "../../webgl/shaders/shader_program";
import type { ShaderProgramOptions } from "../../webgl/shaders/shader_program_types";
import type { ShaderKey } from "../../webgl/shaders/shader_types";
import { SubsystemRestorationPriority } from "../../webgl/core/subsystem_types";

/**
 * Creates a fully spy-wrapped WebGLContextManager conforming to IWebGLContextManager.
 */
export function createMockContextManager(gl?: WebGL2RenderingContext): IMockWebGLContextManager {
    let currentGl: WebGL2RenderingContext | null = gl ?? null;

    const mockShaders: IShaderManager = {
        name: "shader",
        restorationPriority: SubsystemRestorationPriority.Shader,
        activeProgram: null,
        activeShader: null,
        shaderCount: 0,
        getOrCreateShader: vi.fn(
            (_key: ShaderKey, _options: ShaderProgramOptions) =>
                ({
                    id: 1,
                    key: _key,
                    program: {} as WebGLProgram,
                    uniforms: {},
                    use: vi.fn(),
                    destroy: vi.fn(),
                } as unknown as ShaderProgram<never>)
        ),
        getShader: vi.fn(() => null),
        releaseShader: vi.fn(),
        useShader: vi.fn(),
        useProgram: vi.fn(),
        onContextLost: vi.fn(),
        onContextRestored: vi.fn(),
        destroy: vi.fn(),
        getDiagnostics: vi.fn(() => ({ name: "shader", resourceCount: 0, activeBindings: 0 })),
    };

    const mockGeometries: IGeometryManager = {
        name: "geometry",
        restorationPriority: SubsystemRestorationPriority.Geometry,
        activeGeometryId: null,
        geometryCount: 0,
        allocatedCount: 0,
        bind: vi.fn(),
        unbind: vi.fn(),
        dispose: vi.fn(),
        release: vi.fn(),
        getRecord: vi.fn(() => null),
        hasRecord: vi.fn(() => false),
        onContextLost: vi.fn(),
        onContextRestored: vi.fn(),
        destroy: vi.fn(),
        getDiagnostics: vi.fn(() => ({ name: "geometry", resourceCount: 0, activeBindings: 0 })),
    };

    const mockTextures: ITextureManager = {
        name: "texture",
        restorationPriority: SubsystemRestorationPriority.Texture,
        activeBindingsCount: 0,
        boundTextures: new Map(),
        whiteTexture: {} as WebGLTexture,
        blackCubeTexture: {} as WebGLTexture,
        bindTexture: vi.fn(),
        bindCubeTexture: vi.fn(),
        resetBindings: vi.fn(),
        registerTexture: vi.fn(),
        unregisterTexture: vi.fn(),
        onContextLost: vi.fn(),
        onContextRestored: vi.fn(),
        destroy: vi.fn(),
        getDiagnostics: vi.fn(() => ({ name: "texture", resourceCount: 0, activeBindings: 0 })),
    };

    const mockCM: IMockWebGLContextManager = {
        setContext: vi.fn((newGl: WebGL2RenderingContext) => {
            currentGl = newGl;
        }),
        getContext: vi.fn(() => currentGl),
        getCurrentProgram: vi.fn(() => null),
        getCurrentShader: vi.fn(() => null),
        useShader: vi.fn(),
        useProgram: vi.fn(),
        getOrCreateShader: mockShaders.getOrCreateShader,
        getShader: mockShaders.getShader,
        releaseShader: mockShaders.releaseShader,
        createVertexBuffer: vi.fn(
            () =>
                ({
                    bind: vi.fn(),
                    unbind: vi.fn(),
                    setData: vi.fn(),
                    setSubData: vi.fn(),
                    destroy: vi.fn(),
                } as unknown as VertexBuffer)
        ),
        releaseVertexBuffer: vi.fn(),
        applyPipelineState: vi.fn(),
        resetPipelineState: vi.fn(),
        setDepthMask: vi.fn(),
        bindTexture: mockTextures.bindTexture,
        bindCubeTexture: mockTextures.bindCubeTexture,
        getDefaultWhiteTexture: vi.fn(() => ({} as WebGLTexture)),
        getDefaultBlackCubeTexture: vi.fn(() => ({} as WebGLTexture)),
        shaders: mockShaders,
        textures: mockTextures,
        geometries: mockGeometries,
        shaderManager: mockShaders,
        textureManager: mockTextures,
        geometryManager: mockGeometries,
        maxTextureUnits: 16,
        registerSubsystem: vi.fn((sub) => sub),
        getSubsystem: vi.fn(() => null),
        getDiagnostics: vi.fn(() => ({})),
        handleContextLost: vi.fn(),
        handleContextRestored: vi.fn(),
        destroy: vi.fn(),
    };

    return mockCM;
}
