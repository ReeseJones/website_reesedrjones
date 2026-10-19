import { html, LitElement, type TemplateResult } from "lit";
import { setupModelInstanceElement } from "../../scene/elements/model_instance_element";
import { DEFAULT_GALAXY_PARAMETERS } from "../parameters/index";
import type { GalaxyParameters } from "../parameters/types";
import { TAG_RJ_GALAXY_STARS } from "./galaxy_stars_element_constants";
import { getSharedGalaxyGeometry, getSharedGalaxyMaterial } from "../resources/galaxy_resources";

/**
 * Declarative spiral galaxy starfield model element (<rj-galaxy-stars>).
 * Composes an internal <rj-model-instance> in Light DOM, synchronizing procedural
 * GalaxyGeometry and GalaxyMaterial lifecycles with the scene graph hierarchy.
 */
export class GalaxyStarsElement extends LitElement {
    public static override properties = {
        params: { attribute: false },
    };

    public declare params: GalaxyParameters;

    public constructor() {
        super();
        this.params = DEFAULT_GALAXY_PARAMETERS;
    }

    /**
     * Renders into the Light DOM rather than creating a Shadow Root,
     * enabling transparent DOM queries and scene graph hierarchy attachment.
     */
    public override createRenderRoot(): HTMLElement {
        return this;
    }

    protected override render(): TemplateResult {
        return html`
            <rj-model-instance
                .geometry=${getSharedGalaxyGeometry(this.params)}
                .material=${getSharedGalaxyMaterial(this.params)}
            ></rj-model-instance>
        `;
    }
}

let isGalaxyStarsElementRegistered = false;

/**
 * Flag-guarded idempotent setup function that registers <rj-galaxy-stars> with customElements.
 */
export function setupGalaxyStarsElement(): void {
    setupModelInstanceElement();

    if (
        isGalaxyStarsElementRegistered ||
        typeof customElements === "undefined" ||
        Boolean(customElements.get(TAG_RJ_GALAXY_STARS))
    ) {
        return;
    }

    customElements.define(TAG_RJ_GALAXY_STARS, GalaxyStarsElement);
    isGalaxyStarsElementRegistered = true;
}
