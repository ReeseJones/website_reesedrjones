import type { GalaxyParameters } from "./parameters/index";

export interface GalaxyControllerOptions {
    /** Initial configuration parameters or partial overrides */
    initialParams?: Partial<GalaxyParameters>;
    /** Optional localStorage key for parameter persistence. Set to null for ephemeral instances. */
    storageKey?: string | null;
}

export interface GalaxyController {
    /** Active parameter state for the galaxy simulation */
    params: GalaxyParameters;
    /** Batched parameter mutator updating state and GPU uniforms/buffers */
    updateParameters: (partial: Partial<GalaxyParameters>) => void;
    /** Reverts parameters to default profile */
    resetParameters: () => void;
    /** Applies a predefined preset by identifier */
    applyPreset: (presetId: string) => void;
    /** Currently active preset ID, or "custom" if parameters diverged */
    currentPresetId: string;
}
