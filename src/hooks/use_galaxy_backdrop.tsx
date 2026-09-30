import { useGalaxy } from "../galaxy_backdrop/galaxy_context";

/**
 * Hook to access the galaxy backdrop container setter and readiness state.
 * Connects directly to the ambient GalaxyProvider context.
 */
export const useGalaxyBackdrop = () => {
    const { setBackdropContainer, isReady } = useGalaxy();
    return [setBackdropContainer, isReady] as const;
};
