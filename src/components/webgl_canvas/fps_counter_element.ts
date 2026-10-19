import { LitElement, html, css, nothing, type CSSResult, type PropertyValues } from "lit";
import { createRef, ref, type Ref } from "lit/directives/ref.js";
import {
    DECIMAL_PLACES,
    DEFAULT_FPS_COUNTER_MODE,
    DEFAULT_FPS_COUNTER_POSITION,
    INITIAL_FPS_BOTH_TEXT,
    INITIAL_FPS_TEXT,
    INITIAL_FRAME_TIME_TEXT,
    MS_PER_SECOND,
    TAG_RJ_FPS_COUNTER,
} from "./fps_counter_element_constants";
import type { FpsCounterDisplayMode, FpsCounterPosition } from "./fps_counter_element_types";

/**
 * Formats frame duration in milliseconds into a display string based on the chosen display mode.
 *
 * @param frameTimeMs Average frame duration in milliseconds.
 * @param mode Display mode ("both", "fps", "frame-time", or "none"). Defaults to "both".
 * @returns Formatted metric string, e.g. "60 FPS (16.7 ms)", "60 FPS", "16.7 ms", or "".
 */
export function formatFpsMetric(
    frameTimeMs?: number,
    mode: FpsCounterDisplayMode = DEFAULT_FPS_COUNTER_MODE
): string {
    if (mode === "none") {
        return "";
    }

    if (frameTimeMs === undefined || !Number.isFinite(frameTimeMs) || frameTimeMs <= 0) {
        if (mode === "both") {
            return INITIAL_FPS_BOTH_TEXT;
        }
        if (mode === "fps") {
            return INITIAL_FPS_TEXT;
        }
        if (mode === "frame-time") {
            return INITIAL_FRAME_TIME_TEXT;
        }
        return "";
    }

    const fps = MS_PER_SECOND / frameTimeMs;

    if (mode === "both") {
        return `${Math.round(fps)} FPS (${frameTimeMs.toFixed(DECIMAL_PLACES)} ms)`;
    }
    if (mode === "fps") {
        return `${Math.round(fps)} FPS`;
    }
    if (mode === "frame-time") {
        return `${frameTimeMs.toFixed(DECIMAL_PLACES)} ms`;
    }

    return "";
}

/**
 * Lit Web Component (<rj-fps-counter>) displaying render frame rate and frame time.
 * Encapsulates presentation inside Shadow DOM with customizable corner positioning.
 */
export class FpsCounterElement extends LitElement {
    public static override styles: CSSResult = css`
        :host {
            display: contents;
            pointer-events: none;
            user-select: none;
        }

        .badge {
            position: fixed;
            margin: 0;
            inset: unset;
            z-index: 9999;
            display: inline-flex;
            align-items: center;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            background-color: rgba(0, 0, 0, 0.75);
            border: 1px solid rgba(255, 255, 255, 0.15);
            color: #ffffff;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-size: 0.75rem;
            line-height: 1.2;
            font-variant-numeric: tabular-nums;
            pointer-events: none;
            user-select: none;
            white-space: nowrap;
        }

        .badge:popover-open {
            display: inline-flex;
        }

        :host([position="top-left"]) .badge,
        :host(:not([position])) .badge {
            top: 0.5rem;
            bottom: auto;
            left: 0.5rem;
            right: auto;
        }

        :host([position="top-right"]) .badge {
            top: 0.5rem;
            bottom: auto;
            left: auto;
            right: 0.5rem;
        }

        :host([position="bottom-left"]) .badge {
            top: auto;
            bottom: 0.5rem;
            left: 0.5rem;
            right: auto;
        }

        :host([position="bottom-right"]) .badge {
            top: auto;
            bottom: 0.5rem;
            left: auto;
            right: 0.5rem;
        }

        .value {
            color: inherit;
            font: inherit;
        }
    `;

    public static override properties = {
        frameTimeMs: { type: Number, attribute: "frame-time-ms" },
        mode: { type: String, reflect: true },
        position: { type: String, reflect: true },
    };

    public declare frameTimeMs: number | undefined;
    public declare mode: FpsCounterDisplayMode;
    public declare position: FpsCounterPosition;

    private readonly _badgeRef: Ref<HTMLDivElement> = createRef<HTMLDivElement>();

    public constructor() {
        super();
        this.frameTimeMs = undefined;
        this.mode = DEFAULT_FPS_COUNTER_MODE;
        this.position = DEFAULT_FPS_COUNTER_POSITION;
    }

    public override connectedCallback(): void {
        super.connectedCallback();
        if (this.hasUpdated) {
            const badge = this._badgeRef.value;
            if (typeof badge?.showPopover === "function") {
                try {
                    badge.showPopover();
                } catch {
                    // Ignore if popover cannot be shown immediately or in disconnected edge-cases
                }
            }
        }
    }

    public override disconnectedCallback(): void {
        const badge = this._badgeRef.value;
        if (typeof badge?.hidePopover === "function") {
            try {
                badge.hidePopover();
            } catch {
                // Ignore if popover was already hidden or disconnected
            }
        }
        super.disconnectedCallback();
    }

    protected override firstUpdated(changedProperties: PropertyValues<this>): void {
        super.firstUpdated(changedProperties);
        const badge = this._badgeRef.value;
        if (typeof badge?.showPopover === "function") {
            try {
                badge.showPopover();
            } catch {
                // Ignore if popover cannot be shown immediately or in disconnected edge-cases
            }
        }
    }

    protected override updated(changedProperties: PropertyValues<this>): void {
        super.updated(changedProperties);
        if (
            changedProperties.has("mode") &&
            changedProperties.get("mode") === "none" &&
            this.mode !== "none"
        ) {
            const badge = this._badgeRef.value;
            if (typeof badge?.showPopover === "function") {
                try {
                    badge.showPopover();
                } catch {
                    // Ignore if popover cannot be shown immediately or in disconnected edge-cases
                }
            }
        }
    }

    public override render(): unknown {
        if (this.mode === "none") {
            return nothing;
        }

        return html`
            <div ${ref(this._badgeRef)} class="badge" popover="manual" part="badge">
                <span class="value" part="value">${formatFpsMetric(this.frameTimeMs, this.mode)}</span>
                <slot></slot>
            </div>
        `;
    }
}

let isFpsCounterElementRegistered = false;

/**
 * Flag-guarded idempotent setup function that registers <rj-fps-counter> with customElements.
 */
export function setupFpsCounterElement(): void {
    if (
        isFpsCounterElementRegistered ||
        typeof customElements === "undefined" ||
        Boolean(customElements.get(TAG_RJ_FPS_COUNTER))
    ) {
        return;
    }

    customElements.define(TAG_RJ_FPS_COUNTER, FpsCounterElement);
    isFpsCounterElementRegistered = true;
}
