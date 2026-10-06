import { vi } from "vitest";
import type { IWebGLContextManager } from "../../webgl/core/context_manager_types";
import type { IShaderManager } from "../../webgl/shaders/shader_manager_types";
import type { IGeometryManager } from "../../webgl/geometry/geometry_manager_types";
import type { ITextureManager } from "../../webgl/textures/texture_manager_types";
import type { VertexBuffer } from "../../webgl/geometry/vertex_buffer";
import type { ShaderProgram } from "../../webgl/shaders/shader_program";
import type { ShaderProgramOptions } from "../../webgl/shaders/shader_program_types";
import type { ShaderKey } from "../../webgl/shaders/shader_types";
import type { IMeshGeometry } from "../../scene/models/mesh_geometry_types";
import { SubsystemRestorationPriority } from "../../webgl/core/subsystem_types";

/**
 * Creates a spy-wrapped ShaderProgram conforming to the methods used during rendering.
 */
export function createMockShaderProgram(key: string = "unlit"): ShaderProgram<never> {
    return {
        label: key,
        vertSource: "",
        fragSource: "",
        isValid: true,
        isDisposed: false,
        getProgram: vi.fn(() => ({} as WebGLProgram)),
        setUniforms: vi.fn(),
        setFloat: vi.fn(),
        setInt: vi.fn(),
        setVec2: vi.fn(),
        setVec3: vi.fn(),
        setVec4: vi.fn(),
        setMat3: vi.fn(),
        setMat4: vi.fn(),
        getUniformLocation: vi.fn(() => ({} as WebGLUniformLocation)),
        onContextLost: vi.fn(),
        onContextRestored: vi.fn(),
        onDispose: vi.fn(),
        dispose: vi.fn(),
    } as unknown as ShaderProgram<never>;
}

/**
 * Creates a fully spy-wrapped WebGLContextManager conforming to IWebGLContextManager.
 */
export function createMockContextManager(gl?: WebGL2RenderingContext): IWebGLContextManager {
    let currentGl: WebGL2RenderingContext | null = gl ?? null;

    const mockShaders: IShaderManager = {
        name: "shader",
        restorationPriority: SubsystemRestorationPriority.Shader,
        activeProgram: null,
        activeShader: null,
        shaderCount: 0,
        getOrCreate: vi.fn((_key: ShaderKey, _options: ShaderProgramOptions) => createMockShaderProgram(_key)),
        get: vi.fn(() => null),
        has: vi.fn(() => false),
        bind: vi.fn(),
        bindKey: vi.fn((key: ShaderKey) => (mockShaders.get(key) as any) ?? createMockShaderProgram(key)),
        bindProgram: vi.fn(),
        unbind: vi.fn(),
        attach: vi.fn(),
        detach: vi.fn(),
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
        createVertexBuffer: vi.fn(
            () =>
                ({
                    label: "VertexBuffer",
                    isValid: true,
                    isDisposed: false,
                    layout: { attributes: [] },
                    init: vi.fn(),
                    bind: vi.fn(),
                    unbind: vi.fn(),
                    setData: vi.fn(),
                    onContextLost: vi.fn(),
                    onContextRestored: vi.fn(),
                    onDispose: vi.fn(),
                    dispose: vi.fn(),
                } as unknown as VertexBuffer)
        ),
        bind: vi.fn((geometry) => ({
            id: 1,
            vertexBuffer: {} as VertexBuffer,
            indexBuffer: null,
            indexCount: geometry?.indexCount ?? null,
            indexType: 5123,
            uploadedVersion: geometry?.version ?? 0,
            disposeListener: vi.fn(),
        })),
        draw: vi.fn((geometry: IMeshGeometry) => {
            const record = mockGeometries.bind(geometry);
            if (currentGl) {
                if (record.indexCount !== null && record.indexCount > 0) {
                    currentGl.drawElements(geometry.primitiveType, record.indexCount, record.indexType, 0);
                } else {
                    currentGl.drawArrays(geometry.primitiveType, 0, geometry.vertexCount);
                }
            }
        }),
        unbind: vi.fn(),
        dispose: vi.fn(),
        getRecord: vi.fn(() => null),
        hasRecord: vi.fn(() => false),
        attach: vi.fn(),
        detach: vi.fn(),
        onContextLost: vi.fn(),
        onContextRestored: vi.fn(),
        destroy: vi.fn(),
        getDiagnostics: vi.fn(() => ({ name: "geometry", resourceCount: 0, activeBindings: 0 })),
    };

    const mockTextures: ITextureManager = {
        name: "texture",
        restorationPriority: SubsystemRestorationPriority.Texture,
        textureCount: 0,
        cubeTextureCount: 0,
        getOrCreate: vi.fn(),
        get: vi.fn(() => null),
        has: vi.fn(() => false),
        bind: vi.fn(),
        bindHandle: vi.fn(),
        bindCube: vi.fn(),
        bindCubeHandle: vi.fn(),
        unbind: vi.fn(),
        unbindAll: vi.fn(),
        getFallbackHandle: vi.fn(() => ({} as WebGLTexture)),
        attach: vi.fn(),
        detach: vi.fn(),
        onContextLost: vi.fn(),
        onContextRestored: vi.fn(),
        destroy: vi.fn(),
        getDiagnostics: vi.fn(() => ({ name: "texture", resourceCount: 0, activeBindings: 0 })),
    };

    const mockCM: IWebGLContextManager = {
        setContext: vi.fn((newGl: WebGL2RenderingContext) => {
            currentGl = newGl;
        }),
        getContext: vi.fn(() => currentGl),
        getCurrentProgram: vi.fn(() => null),
        getCurrentShader: vi.fn(() => null),
        useShader: vi.fn(),
        useProgram: vi.fn(),
        getOrCreateShader: vi.fn((key, options) => mockShaders.getOrCreate(key, options)),
        getShader: vi.fn((key) => mockShaders.get(key)),
        applyPipelineState: vi.fn(),
        resetPipelineState: vi.fn(),
        setDepthMask: vi.fn(),
        bindTexture: vi.fn(),
        bindCubeTexture: vi.fn(),
        getDefaultWhiteTexture: vi.fn(() => ({} as WebGLTexture)),
        getDefaultBlackCubeTexture: vi.fn(() => ({} as WebGLTexture)),
        shaders: mockShaders,
        textures: mockTextures,
        geometries: mockGeometries,
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
