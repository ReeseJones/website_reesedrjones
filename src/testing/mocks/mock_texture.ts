import { vi } from "vitest";
import type { ITexture } from "../../webgl/textures/texture_types";
import type { ICubeTexture } from "../../webgl/textures/cube_texture_types";

/**
 * Creates a lightweight pure CPU mock fixture conforming to ITexture.
 */
export function createMockTexture(
    label: string = "mock-texture",
    overrides?: Partial<ITexture>
): ITexture {
    return {
        label,
        handle: null,
        width: 64,
        height: 64,
        isLoaded: true,
        options: {},
        isDisposed: false,
        init: vi.fn(),
        updateFromSource: vi.fn(),
        bind: vi.fn(),
        destroy: vi.fn(),
        dispose: vi.fn(),
        onDispose: vi.fn(),
        onContextLost: vi.fn(),
        onContextRestored: vi.fn(),
        ...overrides,
    } as unknown as ITexture;
}

/**
 * Creates a lightweight pure CPU mock fixture conforming to ICubeTexture.
 */
export function createMockCubeTexture(
    label: string = "mock-cubetexture",
    overrides?: Partial<ICubeTexture>
): ICubeTexture {
    return {
        label,
        handle: null,
        isReady: true,
        isDestroyed: false,
        isDisposed: false,
        faces: {
            posX: "px.jpg",
            negX: "nx.jpg",
            posY: "py.jpg",
            negY: "ny.jpg",
            posZ: "pz.jpg",
            negZ: "nz.jpg",
        },
        load: vi.fn().mockResolvedValue(undefined),
        init: vi.fn(),
        destroy: vi.fn(),
        dispose: vi.fn(),
        onDispose: vi.fn(),
        onContextLost: vi.fn(),
        onContextRestored: vi.fn(),
        ...overrides,
    } as unknown as ICubeTexture;
}
