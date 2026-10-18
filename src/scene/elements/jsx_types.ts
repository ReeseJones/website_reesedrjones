import React from "react";
import type { WebGLCanvasElementProps } from "./webgl_canvas_element_types";
import type { SceneElementProps } from "./scene_element_types";
import type { PerspectiveCameraElementProps } from "./perspective_camera_element_types";
import type { Node3DElementProps } from "./node_3d_element_types";
import type { ModelInstanceElementProps } from "./model_instance_element_types";
import type { GalacticCloudElementProps } from "../../galaxy_backdrop/elements/galactic_cloud_element_types";
import type { GalaxyStarsElementProps } from "../../galaxy_backdrop/elements/galaxy_stars_element_types";

declare global {
    namespace React {
        namespace JSX {
            interface IntrinsicElements {
                "rj-webgl-canvas": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & WebGLCanvasElementProps;
                "rj-scene": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & SceneElementProps;
                "rj-perspective-camera": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & PerspectiveCameraElementProps;
                "rj-node-3d": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & Node3DElementProps;
                "rj-model-instance": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & ModelInstanceElementProps;
                "rj-galactic-cloud": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & GalacticCloudElementProps;
                "rj-galaxy-stars": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & GalaxyStarsElementProps;
            }
        }
    }
}

export {};
