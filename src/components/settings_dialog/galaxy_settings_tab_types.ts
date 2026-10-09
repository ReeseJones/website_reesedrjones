import type { GalaxyController } from "../../galaxy_backdrop/galaxy_controller_types";
import type { GalaxyParameters } from "../../galaxy_backdrop/parameters/index";

/**
 * Props for the GalaxySettingsTab component.
 * Can be provided either as a unified GalaxyController instance or as discrete callbacks/state.
 */
export interface GalaxySettingsTabProps {
    /** Unified controller instance for the galaxy simulation */
    controller?: GalaxyController;
    /** Current parameter state (used if controller is not provided) */
    params?: GalaxyParameters;
    /** Currently active preset ID (used if controller is not provided) */
    currentPresetId?: string;
    /** Mutator for updating partial parameters (used if controller is not provided) */
    onChange?: (partial: Partial<GalaxyParameters>) => void;
    /** Callback to reset parameters to defaults (used if controller is not provided) */
    onReset?: () => void;
    /** Callback to apply a preset by ID (used if controller is not provided) */
    onApplyPreset?: (presetId: string) => void;
}
