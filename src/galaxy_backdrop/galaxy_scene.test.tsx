import { describe, it, expect, vi, beforeAll } from "vitest";
import React from "react";
import { render } from "@testing-library/react";
import { BillboardMode } from "../scene/sprites/sprite_instance_types";
import { DEFAULT_GALAXY_PARAMETERS } from "./parameters/index";
import type { GalaxyParameters } from "./parameters/types";
import type { GalaxyController } from "./galaxy_controller_types";
import { DEFAULT_GALAXY_SCENE_PRIORITY } from "./galaxy_scene_constants";
import { GalaxyScene } from "./galaxy_scene";
import { setupSceneElements } from "../scene/elements/setup_scene_elements";

/**
 * Lightweight test parameter profile with a small starCount to keep pure-CPU geometry generation fast.
 */
function createTestGalaxyParams(overrides: Partial<GalaxyParameters> = {}): GalaxyParameters {
    return {
        ...DEFAULT_GALAXY_PARAMETERS,
        starCount: 64,
        ...overrides,
    };
}

describe("<GalaxyScene />", () => {
    beforeAll(() => {
        setupSceneElements();
    });

    it("composes <rj-scene>, <rj-galaxy-camera>, <rj-galactic-cloud>, and <rj-galaxy-stars> at DEFAULT_GALAXY_SCENE_PRIORITY (0)", () => {
        const params = createTestGalaxyParams({ fov: 65 });

        const { container } = render(<GalaxyScene params={params} />);

        const sceneEl = container.querySelector("rj-scene") as (HTMLElement & { priority: number; clearDepth: boolean }) | null;
        expect(sceneEl).not.toBeNull();
        expect(sceneEl?.priority).toBe(DEFAULT_GALAXY_SCENE_PRIORITY);
        expect(sceneEl?.hasAttribute("clear-depth")).toBe(false);

        const cameraEl = container.querySelector("rj-galaxy-camera") as (HTMLElement & { fov: number; makeDefault: boolean; params: unknown }) | null;
        expect(cameraEl).not.toBeNull();
        expect(cameraEl?.fov).toBe(65);
        expect(cameraEl?.makeDefault).toBe(true);
        expect(cameraEl?.hasAttribute("make-default")).toBe(true);
        expect(cameraEl?.params).toBe(params);

        const cloudEl = container.querySelector("rj-galactic-cloud") as (HTMLElement & { params: unknown }) | null;
        expect(cloudEl).not.toBeNull();
        expect(cloudEl?.params).toBe(params);

        const starsEl = container.querySelector("rj-galaxy-stars") as (HTMLElement & { params: unknown }) | null;
        expect(starsEl).not.toBeNull();
        expect(starsEl?.params).toBe(params);

        const spriteInstances = container.querySelectorAll("rj-sprite-instance");
        expect(spriteInstances.length).toBe(2);

        const centerPin = spriteInstances[0] as (HTMLElement & { name: string; billboardMode: BillboardMode });
        expect(centerPin.name).toBe("GalaxyCenterPin");
        expect(centerPin.billboardMode).toBe(BillboardMode.Cylindrical);

        const texturePin = spriteInstances[1] as (HTMLElement & { name: string; billboardMode: BillboardMode });
        expect(texturePin.name).toBe("GalaxyTexturePin");
        expect(texturePin.billboardMode).toBe(BillboardMode.Cylindrical);
    });

    it("forwards clearDepth prop to <rj-scene clear-depth>", () => {
        const { container } = render(<GalaxyScene clearDepth={true} />);

        const sceneEl = container.querySelector("rj-scene") as (HTMLElement & { clearDepth: boolean }) | null;
        expect(sceneEl).not.toBeNull();
        expect(sceneEl?.hasAttribute("clear-depth")).toBe(true);
    });

    it("resolves parameters with precedence: controller.params > params prop > DEFAULT_GALAXY_PARAMETERS, and forwards custom priority", () => {
        const controllerParams = createTestGalaxyParams({ fov: 50, pointScale: 3.5 });
        const propParams = createTestGalaxyParams({ fov: 80, pointScale: 1.5 });

        const mockController: GalaxyController = {
            params: controllerParams,
            updateParameters: vi.fn(),
            resetParameters: vi.fn(),
            applyPreset: vi.fn(),
            currentPresetId: "custom",
        };

        // 1. controller.params takes precedence over params prop
        const { container, rerender } = render(
            <GalaxyScene
                controller={mockController}
                params={propParams}
                priority={15}
            />
        );

        const sceneEl = container.querySelector("rj-scene") as (HTMLElement & { priority: number }) | null;
        expect(sceneEl?.priority).toBe(15);

        const cameraEl = container.querySelector("rj-galaxy-camera") as (HTMLElement & { params: unknown }) | null;
        const cloudEl = container.querySelector("rj-galactic-cloud") as (HTMLElement & { params: unknown }) | null;
        const starsEl = container.querySelector("rj-galaxy-stars") as (HTMLElement & { params: unknown }) | null;
        expect(cameraEl?.params).toBe(controllerParams);
        expect(cloudEl?.params).toBe(controllerParams);
        expect(starsEl?.params).toBe(controllerParams);

        // 2. params prop is used when controller is omitted
        rerender(<GalaxyScene params={propParams} priority={15} />);
        expect(cameraEl?.params).toBe(propParams);
        expect(cloudEl?.params).toBe(propParams);
        expect(starsEl?.params).toBe(propParams);

        // 3. DEFAULT_GALAXY_PARAMETERS is used when both controller and params are omitted
        rerender(<GalaxyScene />);
        expect(cameraEl?.params).toBe(DEFAULT_GALAXY_PARAMETERS);
        expect(cloudEl?.params).toBe(DEFAULT_GALAXY_PARAMETERS);
        expect(starsEl?.params).toBe(DEFAULT_GALAXY_PARAMETERS);
    });
});
