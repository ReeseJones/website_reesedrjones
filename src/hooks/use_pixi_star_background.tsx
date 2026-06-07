import { useEffect, useRef, useState } from "react";
import { StarField } from "../star_field/star_field_app";
import { Application, Renderer } from "pixi.js";

export const usePixiStarBackground = (
    pixiApp: React.RefObject<Application<Renderer> | null>,
    isAppReady: boolean,
    maxDepth: number,
    maxEdges: number,
    minEdges: number,
    rootStars: number
) => {

    const starField = useRef<StarField | null>(null);
    const [starfieldIsReady, setStarfieldIsReady] = useState(false);

    useEffect(() => {
        let isMounted = true;
        if (!pixiApp.current || !isAppReady) {
            return;
        }

        starField.current = new StarField(pixiApp.current, {
            maxDepth,
            maxEdges,
            minEdges,
            count: rootStars
        });

        starField.current.initialize().then(() => {
            if(!isMounted) {
                return;
            }

            setStarfieldIsReady(true);
        });

        return () => {
            isMounted = false;
            if (starField.current) {
                starField.current.destroy();
                starField.current = null;
            }
        };
    }, [isAppReady, maxDepth, maxEdges, minEdges, rootStars]);

    return [starField, starfieldIsReady] as const;
};
