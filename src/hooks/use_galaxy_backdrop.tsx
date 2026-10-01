import { useGalaxyController } from "../galaxy_backdrop/use_galaxy_controller";

/**
 * Hook to create an independent galaxy backdrop controller instance.
 */
export const useGalaxyBackdrop = () => {
    const controller = useGalaxyController();
    return controller;
};
