import * as PIXI from "pixi.js";
import { useEffect, useRef } from "react";
import { StarField } from "../star_field/star_field_app";

export const usePixiStarBackground = (
    pixiApp: PIXI.Application | null,
    maxDepth: number,
    maxEdges: number,
    minEdges: number,
    rootStars: number
) => {
    const starField = useRef<StarField | null>(null);

    useEffect(() => {
        if (pixiApp) {
            const starfieldTemp = new StarField(pixiApp, {
                maxDepth,
                maxEdges,
                minEdges,
                count: rootStars
            });

            starfieldTemp.initialize().then(() => {
                starField.current = starfieldTemp;
            });
        }

        return () => {
            if (starField.current) {
                starField.current.destroy();
                starField.current = null;
            }
        };
    }, [pixiApp, maxDepth, maxEdges, minEdges, rootStars]);
};
