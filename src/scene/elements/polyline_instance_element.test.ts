import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from "vitest";
import { LitElement } from "lit";
import { ContextConsumer } from "@lit/context";
import {
    PolylineInstanceElement,
    setupPolylineElement,
    polylinePointsConverter,
    polylineJoinStyleConverter,
    polylineCapStyleConverter,
} from "./polyline_instance_element";
import {
    TAG_RJ_POLYLINE,
    DEFAULT_POLYLINE_NAME,
    DEFAULT_POLYLINE_HIDDEN,
    DEFAULT_POLYLINE_ELEMENT_RENDER_ORDER,
    DEFAULT_POLYLINE_ELEMENT_POSITION,
    DEFAULT_POLYLINE_ELEMENT_ROTATION,
    DEFAULT_POLYLINE_ELEMENT_SCALE,
    DEFAULT_POLYLINE_ELEMENT_POINTS,
    DEFAULT_POLYLINE_ELEMENT_WIDTH,
    DEFAULT_POLYLINE_ELEMENT_MITER_LIMIT,
    DEFAULT_POLYLINE_ELEMENT_COLOR,
    DEFAULT_POLYLINE_ELEMENT_GLOW_COLOR,
    DEFAULT_POLYLINE_ELEMENT_GLOW_INTENSITY,
    DEFAULT_POLYLINE_ELEMENT_DASH_SPEED,
    DEFAULT_POLYLINE_ELEMENT_DASH_FREQUENCY,
} from "./polyline_instance_element_constants";
import { PolylineInstance } from "../lines/polyline_instance";
import { PolylineMaterial } from "../lines/polyline_material";
import {
    PolylineJoinStyle,
    PolylineCapStyle,
} from "../lines/polyline_instance_types";
import { setupSceneElement } from "./scene_element";
import { TAG_RJ_SCENE } from "./scene_element_constants";
import { parentNodeContext } from "./scene_element_types";
import type { ISceneNode } from "../core/scene_node_types";
import type { Vector3Like } from "../../maths/vector_types";
import type { RgbaLike } from "../../helpers/colors_types";
import { setupNode3DElement } from "./node_3d_element";
import { TAG_RJ_NODE_3D } from "./node_3d_element_constants";

class TestPolylineChildConsumerElement extends LitElement {
    public parentValue: ISceneNode | undefined;
    public notifyCount = 0;

    public parentConsumer = new ContextConsumer(this, {
        context: parentNodeContext,
        subscribe: true,
        callback: (value) => {
            this.parentValue = value;
            this.notifyCount++;
        },
    });

    public override createRenderRoot(): HTMLElement {
        return this;
    }
}

describe("setupPolylineElement()", () => {
    it("should be idempotent and register the custom element tag 'rj-polyline'", () => {
        setupPolylineElement();
        expect(customElements.get(TAG_RJ_POLYLINE)).toBe(PolylineInstanceElement);

        // Multiple invocations must be safe and idempotent
        expect(() => setupPolylineElement()).not.toThrow();
    });
});

describe("polyline converters", () => {
    describe("polylinePointsConverter", () => {
        it("should parse JSON array of coordinate arrays", () => {
            const result = polylinePointsConverter.fromAttribute("[[0, 1, 2], [3, 4, 5]]");
            expect(result).toEqual([
                { x: 0, y: 1, z: 2 },
                { x: 3, y: 4, z: 5 },
            ]);
        });

        it("should parse JSON array of Vector3Like objects", () => {
            const result = polylinePointsConverter.fromAttribute(
                '[{"x": 10, "y": 20, "z": 30}, {"x": 40, "y": 50, "z": 60}]'
            );
            expect(result).toEqual([
                { x: 10, y: 20, z: 30 },
                { x: 40, y: 50, z: 60 },
            ]);
        });

        it("should parse space and comma delimited coordinate triplets", () => {
            const result = polylinePointsConverter.fromAttribute("0 0 0, 10 20 30, 40 50 60");
            expect(result).toEqual([
                { x: 0, y: 0, z: 0 },
                { x: 10, y: 20, z: 30 },
                { x: 40, y: 50, z: 60 },
            ]);
        });

        it("should parse newline delimited coordinate triplets", () => {
            const result = polylinePointsConverter.fromAttribute("0 0 0\n1 2 3\n4 5 6");
            expect(result).toEqual([
                { x: 0, y: 0, z: 0 },
                { x: 1, y: 2, z: 3 },
                { x: 4, y: 5, z: 6 },
            ]);
        });

        it("should return empty array for null, empty string, or invalid input", () => {
            expect(polylinePointsConverter.fromAttribute(null)).toEqual([]);
            expect(polylinePointsConverter.fromAttribute("")).toEqual([]);
            expect(polylinePointsConverter.fromAttribute("   ")).toEqual([]);
            expect(polylinePointsConverter.fromAttribute("not-valid-points")).toEqual([]);
        });

        it("should serialize Vector3Like[] to string attribute format", () => {
            const points: Vector3Like[] = [
                { x: 0, y: 0, z: 0 },
                { x: 5, y: 10, z: 15 },
            ];
            expect(polylinePointsConverter.toAttribute(points)).toBe("0 0 0, 5 10 15");
        });

        it("should serialize Float32Array to string attribute format", () => {
            const raw = new Float32Array([0, 0, 0, 1, 2, 3]);
            expect(polylinePointsConverter.toAttribute(raw)).toBe("0 0 0, 1 2 3");
        });

        it("should return empty string when serializing null or empty", () => {
            expect(polylinePointsConverter.toAttribute(null)).toBe("");
        });
    });

    describe("polylineJoinStyleConverter", () => {
        it("should convert kebab-case and case-agnostic attribute strings to PolylineJoinStyle enum", () => {
            expect(polylineJoinStyleConverter.fromAttribute("miter")).toBe(PolylineJoinStyle.Miter);
            expect(polylineJoinStyleConverter.fromAttribute("bevel")).toBe(PolylineJoinStyle.Bevel);
            expect(polylineJoinStyleConverter.fromAttribute("round")).toBe(PolylineJoinStyle.Round);
            expect(polylineJoinStyleConverter.fromAttribute("MITER")).toBe(PolylineJoinStyle.Miter);
            expect(polylineJoinStyleConverter.fromAttribute("BEVEL")).toBe(PolylineJoinStyle.Bevel);
            expect(polylineJoinStyleConverter.fromAttribute("ROUND")).toBe(PolylineJoinStyle.Round);
        });

        it("should fallback to defaultValue for invalid or numeric inputs", () => {
            expect(polylineJoinStyleConverter.fromAttribute("0")).toBe(PolylineJoinStyle.Miter);
            expect(polylineJoinStyleConverter.fromAttribute("unknown-style")).toBe(PolylineJoinStyle.Miter);
            expect(polylineJoinStyleConverter.fromAttribute(null)).toBe(PolylineJoinStyle.Miter);
        });

        it("should convert enum value to string attribute", () => {
            expect(polylineJoinStyleConverter.toAttribute(PolylineJoinStyle.Miter)).toBe("miter");
            expect(polylineJoinStyleConverter.toAttribute(PolylineJoinStyle.Bevel)).toBe("bevel");
            expect(polylineJoinStyleConverter.toAttribute(PolylineJoinStyle.Round)).toBe("round");
        });
    });

    describe("polylineCapStyleConverter", () => {
        it("should convert kebab-case and case-agnostic attribute strings to PolylineCapStyle enum", () => {
            expect(polylineCapStyleConverter.fromAttribute("butt")).toBe(PolylineCapStyle.Butt);
            expect(polylineCapStyleConverter.fromAttribute("square")).toBe(PolylineCapStyle.Square);
            expect(polylineCapStyleConverter.fromAttribute("round")).toBe(PolylineCapStyle.Round);
            expect(polylineCapStyleConverter.fromAttribute("BUTT")).toBe(PolylineCapStyle.Butt);
            expect(polylineCapStyleConverter.fromAttribute("SQUARE")).toBe(PolylineCapStyle.Square);
            expect(polylineCapStyleConverter.fromAttribute("ROUND")).toBe(PolylineCapStyle.Round);
        });

        it("should fallback to defaultValue for invalid or numeric inputs", () => {
            expect(polylineCapStyleConverter.fromAttribute("0")).toBe(PolylineCapStyle.Round);
            expect(polylineCapStyleConverter.fromAttribute("unknown-cap")).toBe(PolylineCapStyle.Round);
            expect(polylineCapStyleConverter.fromAttribute(null)).toBe(PolylineCapStyle.Round);
        });

        it("should convert enum value to string attribute", () => {
            expect(polylineCapStyleConverter.toAttribute(PolylineCapStyle.Butt)).toBe("butt");
            expect(polylineCapStyleConverter.toAttribute(PolylineCapStyle.Square)).toBe("square");
            expect(polylineCapStyleConverter.toAttribute(PolylineCapStyle.Round)).toBe("round");
        });
    });
});

describe("PolylineInstanceElement", () => {
    let element: PolylineInstanceElement;

    beforeAll(() => {
        setupPolylineElement();
        setupSceneElement();
        setupNode3DElement();
        if (!customElements.get("test-polyline-child-consumer")) {
            customElements.define("test-polyline-child-consumer", TestPolylineChildConsumerElement);
        }
    });

    beforeEach(() => {
        element = document.createElement(TAG_RJ_POLYLINE);
        document.body.appendChild(element);
    });

    afterEach(() => {
        element.remove();
        document.body.innerHTML = "";
    });

    describe("createRenderRoot()", () => {
        it("should return the element itself for Light DOM rendering without shadow root", () => {
            expect(element.createRenderRoot()).toBe(element);
            expect(element.shadowRoot).toBeNull();
        });
    });

    describe(".polylineInstance and .node", () => {
        it("should expose an underlying PolylineInstance with matching defaults", async () => {
            await element.updateComplete;
            const instance = element.polylineInstance;

            expect(instance).toBeInstanceOf(PolylineInstance);
            expect(element.node).toBe(instance);
            expect(instance.isRenderable).toBe(true);
            expect(instance.name).toBe(DEFAULT_POLYLINE_NAME);
            expect(instance.visible).toBe(true);
            expect(instance.renderOrder).toBe(DEFAULT_POLYLINE_ELEMENT_RENDER_ORDER);
            expect(instance.width).toBeCloseTo(DEFAULT_POLYLINE_ELEMENT_WIDTH);
            expect(instance.miterLimit).toBeCloseTo(DEFAULT_POLYLINE_ELEMENT_MITER_LIMIT);
            expect(instance.glowIntensity).toBeCloseTo(DEFAULT_POLYLINE_ELEMENT_GLOW_INTENSITY);
            expect(instance.dashSpeed).toBeCloseTo(DEFAULT_POLYLINE_ELEMENT_DASH_SPEED);
            expect(instance.dashFrequency).toBeCloseTo(DEFAULT_POLYLINE_ELEMENT_DASH_FREQUENCY);
            expect(instance.joinStyle).toBe(PolylineJoinStyle.Miter);
            expect(instance.capStyle).toBe(PolylineCapStyle.Round);
            expect(instance.material).toBeInstanceOf(PolylineMaterial);
            expect(instance.transform.getPosition()).toEqual({ x: 0, y: 0, z: 0 });
            expect(instance.transform.getScale()).toEqual({ x: 1, y: 1, z: 1 });
        });
    });

    describe("reactive properties and attribute synchronization", () => {
        describe("name", () => {
            it("should default to DEFAULT_POLYLINE_NAME", async () => {
                await element.updateComplete;
                expect(element.name).toBe(DEFAULT_POLYLINE_NAME);
                expect(element.polylineInstance.name).toBe(DEFAULT_POLYLINE_NAME);
            });

            it("should reconcile to polylineInstance.name and reflect to attribute on property change", async () => {
                const targetName = "AlphaRouteWaypoints";
                element.name = targetName;
                await element.updateComplete;

                expect(element.name).toBe(targetName);
                expect(element.polylineInstance.name).toBe(targetName);
                expect(element.getAttribute("name")).toBe(targetName);
            });

            it("should update property and polylineInstance.name on attribute change", async () => {
                const attributeName = "BravoRoute";
                element.setAttribute("name", attributeName);
                await element.updateComplete;

                expect(element.name).toBe(attributeName);
                expect(element.polylineInstance.name).toBe(attributeName);
            });
        });

        describe("position", () => {
            it("should default to (0, 0, 0) and sync with transform", async () => {
                await element.updateComplete;
                expect(element.position).toEqual(DEFAULT_POLYLINE_ELEMENT_POSITION);
                expect(element.polylineInstance.transform.getPosition()).toEqual({ x: 0, y: 0, z: 0 });
            });

            it("should reconcile to polylineInstance.transform.position and reflect to attribute", async () => {
                const targetPos: Vector3Like = { x: 10, y: 20, z: 30 };
                element.position = targetPos;
                await element.updateComplete;

                expect(element.position).toEqual(targetPos);
                expect(element.polylineInstance.transform.getPosition()).toEqual({ x: 10, y: 20, z: 30 });
                expect(element.getAttribute("position")).toBe("10 20 30");
            });

            it("should parse string attribute values", async () => {
                element.setAttribute("position", "5 15 25");
                await element.updateComplete;

                expect(element.position).toEqual({ x: 5, y: 15, z: 25 });
                expect(element.polylineInstance.transform.getPosition()).toEqual({ x: 5, y: 15, z: 25 });
            });
        });

        describe("rotation", () => {
            it("should default to (0, 0, 0) and sync with transform", async () => {
                await element.updateComplete;
                expect(element.rotation).toEqual(DEFAULT_POLYLINE_ELEMENT_ROTATION);
                const angles = element.polylineInstance.transform.getEulerAngles();
                expect(angles.pitch).toBeCloseTo(0);
                expect(angles.yaw).toBeCloseTo(0);
                expect(angles.roll).toBeCloseTo(0);
            });

            it("should reconcile to polylineInstance.transform.rotation and reflect to attribute", async () => {
                const targetRot: Vector3Like = { x: 0.2, y: 0.4, z: 0.6 };
                element.rotation = targetRot;
                await element.updateComplete;

                expect(element.rotation).toEqual(targetRot);
                const angles = element.polylineInstance.transform.getEulerAngles();
                expect(angles.pitch).toBeCloseTo(0.2, 4);
                expect(angles.yaw).toBeCloseTo(0.4, 4);
                expect(angles.roll).toBeCloseTo(0.6, 4);
                expect(element.getAttribute("rotation")).toBe("0.2 0.4 0.6");
            });
        });

        describe("scale", () => {
            it("should default to (1, 1, 1) and sync with transform", async () => {
                await element.updateComplete;
                expect(element.scale).toEqual(DEFAULT_POLYLINE_ELEMENT_SCALE);
                expect(element.polylineInstance.transform.getScale()).toEqual({ x: 1, y: 1, z: 1 });
            });

            it("should reconcile to polylineInstance.transform.scale and reflect to attribute", async () => {
                const targetScale: Vector3Like = { x: 2, y: 2, z: 2 };
                element.scale = targetScale;
                await element.updateComplete;

                expect(element.scale).toEqual(targetScale);
                expect(element.polylineInstance.transform.getScale()).toEqual({ x: 2, y: 2, z: 2 });
                expect(element.getAttribute("scale")).toBe("2 2 2");
            });
        });

        describe("hidden", () => {
            it("should default to false and set polylineInstance.visible = true", async () => {
                await element.updateComplete;
                expect(element.hidden).toBe(DEFAULT_POLYLINE_HIDDEN);
                expect(element.polylineInstance.visible).toBe(true);
            });

            it("should toggle polylineInstance.visible to false when hidden is true", async () => {
                element.hidden = true;
                await element.updateComplete;

                expect(element.hidden).toBe(true);
                expect(element.polylineInstance.visible).toBe(false);
                expect(element.hasAttribute("hidden")).toBe(true);

                element.hidden = false;
                await element.updateComplete;

                expect(element.polylineInstance.visible).toBe(true);
                expect(element.hasAttribute("hidden")).toBe(false);
            });

            it("should update property and polylineInstance.visible via hidden attribute", async () => {
                element.setAttribute("hidden", "");
                await element.updateComplete;

                expect(element.hidden).toBe(true);
                expect(element.polylineInstance.visible).toBe(false);

                element.removeAttribute("hidden");
                await element.updateComplete;

                expect(element.hidden).toBe(false);
                expect(element.polylineInstance.visible).toBe(true);
            });
        });

        describe("renderOrder", () => {
            it("should default to DEFAULT_POLYLINE_ELEMENT_RENDER_ORDER (2000)", async () => {
                await element.updateComplete;
                expect(element.renderOrder).toBe(DEFAULT_POLYLINE_ELEMENT_RENDER_ORDER);
                expect(element.polylineInstance.renderOrder).toBe(DEFAULT_POLYLINE_ELEMENT_RENDER_ORDER);
            });

            it("should reconcile to polylineInstance.renderOrder and reflect to 'render-order' attribute", async () => {
                element.renderOrder = 3000;
                await element.updateComplete;

                expect(element.renderOrder).toBe(3000);
                expect(element.polylineInstance.renderOrder).toBe(3000);
                expect(element.getAttribute("render-order")).toBe("3000");
            });

            it("should parse 'render-order' attribute", async () => {
                element.setAttribute("render-order", "4500");
                await element.updateComplete;

                expect(element.renderOrder).toBe(4500);
                expect(element.polylineInstance.renderOrder).toBe(4500);
            });
        });

        describe("points", () => {
            it("should default to empty array and 0 points on geometry", async () => {
                await element.updateComplete;
                expect(element.points).toEqual(DEFAULT_POLYLINE_ELEMENT_POINTS);
                expect(element.polylineInstance.geometry.pointsCount).toBe(0);
            });

            it("should update geometry waypoints and reflect to attribute on property change", async () => {
                const testPoints: Vector3Like[] = [
                    { x: 0, y: 0, z: 0 },
                    { x: 10, y: 0, z: 0 },
                ];
                element.points = testPoints;
                await element.updateComplete;

                expect(element.polylineInstance.geometry.pointsCount).toBe(2);
                expect(element.polylineInstance.geometry.totalLength).toBeCloseTo(10.0);
                expect(element.getAttribute("points")).toBe("0 0 0, 10 0 0");
            });

            it("should parse points from string attribute", async () => {
                element.setAttribute("points", "0 0 0, 0 5 0, 0 5 12");
                await element.updateComplete;

                expect(element.polylineInstance.geometry.pointsCount).toBe(3);
                expect(element.polylineInstance.geometry.totalLength).toBeCloseTo(17.0);
            });
        });

        describe("lineWidth", () => {
            it("should default to DEFAULT_POLYLINE_ELEMENT_WIDTH (4.0)", async () => {
                await element.updateComplete;
                expect(element.lineWidth).toBeCloseTo(DEFAULT_POLYLINE_ELEMENT_WIDTH);
                expect(element.polylineInstance.width).toBeCloseTo(DEFAULT_POLYLINE_ELEMENT_WIDTH);
            });

            it("should update polylineInstance.width and reflect to 'line-width' attribute", async () => {
                element.lineWidth = 8.0;
                await element.updateComplete;

                expect(element.lineWidth).toBe(8.0);
                expect(element.polylineInstance.width).toBe(8.0);
                expect(element.getAttribute("line-width")).toBe("8");
            });

            it("should parse 'line-width' attribute", async () => {
                element.setAttribute("line-width", "12");
                await element.updateComplete;

                expect(element.lineWidth).toBe(12);
                expect(element.polylineInstance.width).toBe(12);
            });
        });

        describe("miterLimit", () => {
            it("should default to DEFAULT_POLYLINE_ELEMENT_MITER_LIMIT (3.0)", async () => {
                await element.updateComplete;
                expect(element.miterLimit).toBeCloseTo(DEFAULT_POLYLINE_ELEMENT_MITER_LIMIT);
                expect(element.polylineInstance.miterLimit).toBeCloseTo(DEFAULT_POLYLINE_ELEMENT_MITER_LIMIT);
            });

            it("should update polylineInstance.miterLimit and reflect to 'miter-limit' attribute", async () => {
                element.miterLimit = 5.0;
                await element.updateComplete;

                expect(element.miterLimit).toBe(5.0);
                expect(element.polylineInstance.miterLimit).toBe(5.0);
                expect(element.getAttribute("miter-limit")).toBe("5");
            });

            it("should parse 'miter-limit' attribute", async () => {
                element.setAttribute("miter-limit", "6.5");
                await element.updateComplete;

                expect(element.miterLimit).toBeCloseTo(6.5);
                expect(element.polylineInstance.miterLimit).toBeCloseTo(6.5);
            });
        });

        describe("color", () => {
            it("should default to DEFAULT_POLYLINE_ELEMENT_COLOR", async () => {
                await element.updateComplete;
                const col = element.color;
                expect(col.r).toBeCloseTo(DEFAULT_POLYLINE_ELEMENT_COLOR.r);
                expect(col.g).toBeCloseTo(DEFAULT_POLYLINE_ELEMENT_COLOR.g);
                expect(col.b).toBeCloseTo(DEFAULT_POLYLINE_ELEMENT_COLOR.b);
                expect(col.a).toBeCloseTo(DEFAULT_POLYLINE_ELEMENT_COLOR.a!);
            });

            it("should update polylineInstance color and reflect to attribute on property change", async () => {
                const targetColor: RgbaLike = { r: 1.0, g: 0.0, b: 0.0, a: 1.0 };
                element.color = targetColor;
                await element.updateComplete;

                const instanceCol = element.polylineInstance.getColor();
                expect(instanceCol.r).toBeCloseTo(1.0);
                expect(instanceCol.g).toBeCloseTo(0.0);
                expect(instanceCol.b).toBeCloseTo(0.0);
                expect(instanceCol.a).toBeCloseTo(1.0);
                expect(element.getAttribute("color")).toBe("#ff0000");
            });

            it("should parse color from hex attribute", async () => {
                element.setAttribute("color", "#00ff00");
                await element.updateComplete;

                const col = element.polylineInstance.getColor();
                expect(col.r).toBeCloseTo(0.0);
                expect(col.g).toBeCloseTo(1.0);
                expect(col.b).toBeCloseTo(0.0);
            });
        });

        describe("glowColor", () => {
            it("should default to DEFAULT_POLYLINE_ELEMENT_GLOW_COLOR", async () => {
                await element.updateComplete;
                const glow = element.glowColor;
                expect(glow.r).toBeCloseTo(DEFAULT_POLYLINE_ELEMENT_GLOW_COLOR.r);
                expect(glow.g).toBeCloseTo(DEFAULT_POLYLINE_ELEMENT_GLOW_COLOR.g);
                expect(glow.b).toBeCloseTo(DEFAULT_POLYLINE_ELEMENT_GLOW_COLOR.b);
                expect(glow.a).toBeCloseTo(DEFAULT_POLYLINE_ELEMENT_GLOW_COLOR.a!);
            });

            it("should update polylineInstance glowColor and reflect to 'glow-color' attribute", async () => {
                const targetGlow: RgbaLike = { r: 0.5, g: 0.5, b: 1.0, a: 0.8 };
                element.glowColor = targetGlow;
                await element.updateComplete;

                const instanceGlow = element.polylineInstance.getGlowColor();
                expect(instanceGlow.r).toBeCloseTo(0.5);
                expect(instanceGlow.g).toBeCloseTo(0.5);
                expect(instanceGlow.b).toBeCloseTo(1.0);
                expect(instanceGlow.a).toBeCloseTo(0.8);
                expect(element.getAttribute("glow-color")).toBe("#8080ffcc");
            });

            it("should parse 'glow-color' from hex attribute", async () => {
                element.setAttribute("glow-color", "#ffff00");
                await element.updateComplete;

                const glow = element.polylineInstance.getGlowColor();
                expect(glow.r).toBeCloseTo(1.0);
                expect(glow.g).toBeCloseTo(1.0);
                expect(glow.b).toBeCloseTo(0.0);
            });

            it("should parse 'glow-color' from space-delimited floats attribute", async () => {
                element.setAttribute("glow-color", "0.2 0.4 0.6 0.8");
                await element.updateComplete;

                const glow = element.polylineInstance.getGlowColor();
                expect(glow.r).toBeCloseTo(0.2);
                expect(glow.g).toBeCloseTo(0.4);
                expect(glow.b).toBeCloseTo(0.6);
                expect(glow.a).toBeCloseTo(0.8);
            });
        });

        describe("glowIntensity", () => {
            it("should default to DEFAULT_POLYLINE_ELEMENT_GLOW_INTENSITY (1.0)", async () => {
                await element.updateComplete;
                expect(element.glowIntensity).toBeCloseTo(DEFAULT_POLYLINE_ELEMENT_GLOW_INTENSITY);
                expect(element.polylineInstance.glowIntensity).toBeCloseTo(DEFAULT_POLYLINE_ELEMENT_GLOW_INTENSITY);
            });

            it("should update polylineInstance.glowIntensity and reflect to 'glow-intensity' attribute", async () => {
                element.glowIntensity = 2.5;
                await element.updateComplete;

                expect(element.glowIntensity).toBe(2.5);
                expect(element.polylineInstance.glowIntensity).toBe(2.5);
                expect(element.getAttribute("glow-intensity")).toBe("2.5");
            });

            it("should parse 'glow-intensity' attribute", async () => {
                element.setAttribute("glow-intensity", "3.2");
                await element.updateComplete;

                expect(element.glowIntensity).toBeCloseTo(3.2);
                expect(element.polylineInstance.glowIntensity).toBeCloseTo(3.2);
            });
        });

        describe("dashSpeed", () => {
            it("should default to DEFAULT_POLYLINE_ELEMENT_DASH_SPEED (0.0)", async () => {
                await element.updateComplete;
                expect(element.dashSpeed).toBeCloseTo(DEFAULT_POLYLINE_ELEMENT_DASH_SPEED);
                expect(element.polylineInstance.dashSpeed).toBeCloseTo(DEFAULT_POLYLINE_ELEMENT_DASH_SPEED);
            });

            it("should update polylineInstance.dashSpeed and reflect to 'dash-speed' attribute", async () => {
                element.dashSpeed = 1.8;
                await element.updateComplete;

                expect(element.dashSpeed).toBe(1.8);
                expect(element.polylineInstance.dashSpeed).toBe(1.8);
                expect(element.getAttribute("dash-speed")).toBe("1.8");
            });

            it("should parse 'dash-speed' attribute", async () => {
                element.setAttribute("dash-speed", "2.4");
                await element.updateComplete;

                expect(element.dashSpeed).toBeCloseTo(2.4);
                expect(element.polylineInstance.dashSpeed).toBeCloseTo(2.4);
            });
        });

        describe("dashFrequency", () => {
            it("should default to DEFAULT_POLYLINE_ELEMENT_DASH_FREQUENCY (0.1)", async () => {
                await element.updateComplete;
                expect(element.dashFrequency).toBeCloseTo(DEFAULT_POLYLINE_ELEMENT_DASH_FREQUENCY);
                expect(element.polylineInstance.dashFrequency).toBeCloseTo(DEFAULT_POLYLINE_ELEMENT_DASH_FREQUENCY);
            });

            it("should update polylineInstance.dashFrequency and reflect to 'dash-frequency' attribute", async () => {
                element.dashFrequency = 0.35;
                await element.updateComplete;

                expect(element.dashFrequency).toBe(0.35);
                expect(element.polylineInstance.dashFrequency).toBe(0.35);
                expect(element.getAttribute("dash-frequency")).toBe("0.35");
            });

            it("should parse 'dash-frequency' attribute", async () => {
                element.setAttribute("dash-frequency", "0.75");
                await element.updateComplete;

                expect(element.dashFrequency).toBeCloseTo(0.75);
                expect(element.polylineInstance.dashFrequency).toBeCloseTo(0.75);
            });
        });

        describe("joinStyle", () => {
            it("should default to PolylineJoinStyle.Miter", async () => {
                await element.updateComplete;
                expect(element.joinStyle).toBe(PolylineJoinStyle.Miter);
                expect(element.polylineInstance.joinStyle).toBe(PolylineJoinStyle.Miter);
            });

            it("should update polylineInstance.joinStyle and reflect to 'join-style' attribute", async () => {
                element.joinStyle = PolylineJoinStyle.Round;
                await element.updateComplete;

                expect(element.joinStyle).toBe(PolylineJoinStyle.Round);
                expect(element.polylineInstance.joinStyle).toBe(PolylineJoinStyle.Round);
                expect(element.getAttribute("join-style")).toBe("round");
            });

            it("should parse 'join-style' attribute", async () => {
                element.setAttribute("join-style", "bevel");
                await element.updateComplete;

                expect(element.joinStyle).toBe(PolylineJoinStyle.Bevel);
                expect(element.polylineInstance.joinStyle).toBe(PolylineJoinStyle.Bevel);
            });
        });

        describe("capStyle", () => {
            it("should default to PolylineCapStyle.Round", async () => {
                await element.updateComplete;
                expect(element.capStyle).toBe(PolylineCapStyle.Round);
                expect(element.polylineInstance.capStyle).toBe(PolylineCapStyle.Round);
            });

            it("should update polylineInstance.capStyle and reflect to 'cap-style' attribute", async () => {
                element.capStyle = PolylineCapStyle.Square;
                await element.updateComplete;

                expect(element.capStyle).toBe(PolylineCapStyle.Square);
                expect(element.polylineInstance.capStyle).toBe(PolylineCapStyle.Square);
                expect(element.getAttribute("cap-style")).toBe("square");
            });

            it("should parse 'cap-style' attribute", async () => {
                element.setAttribute("cap-style", "butt");
                await element.updateComplete;

                expect(element.capStyle).toBe(PolylineCapStyle.Butt);
                expect(element.polylineInstance.capStyle).toBe(PolylineCapStyle.Butt);
            });
        });

        describe("material", () => {
            it("should assign custom material to polylineInstance", async () => {
                const customMaterial = new PolylineMaterial({ lineWidth: 20.0 });
                element.material = customMaterial;
                await element.updateComplete;

                expect(element.material).toBe(customMaterial);
                expect(element.polylineInstance.material).toBe(customMaterial);
            });
        });
    });

    describe("hierarchy and @lit/context integration", () => {
        it("should automatically register as a child of parent SceneElement when appended inside <rj-scene>", () => {
            const sceneElement = document.createElement(TAG_RJ_SCENE);
            document.body.appendChild(sceneElement);

            sceneElement.appendChild(element);

            expect(sceneElement.scene.children).toContain(element.polylineInstance);
            expect(element.polylineInstance.parent).toBe(sceneElement.scene);

            element.remove();
            expect(sceneElement.scene.children).not.toContain(element.polylineInstance);
            expect(element.polylineInstance.parent).toBeNull();

            sceneElement.remove();
        });

        it("should automatically register as a child of Node3DElement when appended inside <rj-node-3d>", () => {
            const parentElement = document.createElement(TAG_RJ_NODE_3D);
            document.body.appendChild(parentElement);

            parentElement.appendChild(element);

            expect(parentElement.node.children).toContain(element.polylineInstance);
            expect(element.polylineInstance.parent).toBe(parentElement.node);

            element.remove();
            expect(parentElement.node.children).not.toContain(element.polylineInstance);
            expect(element.polylineInstance.parent).toBeNull();

            parentElement.remove();
        });

        it("should provide parentNodeContext value to child consumer elements", () => {
            const childConsumer = document.createElement(
                "test-polyline-child-consumer"
            ) as TestPolylineChildConsumerElement;
            element.appendChild(childConsumer);

            expect(childConsumer.parentValue).toBe(element.polylineInstance);

            childConsumer.remove();
        });

        it("should update parent-child relations when reparented from one node to another", () => {
            const parent1 = document.createElement(TAG_RJ_NODE_3D);
            const parent2 = document.createElement(TAG_RJ_NODE_3D);
            document.body.appendChild(parent1);
            document.body.appendChild(parent2);

            parent1.appendChild(element);
            expect(parent1.node.children).toContain(element.polylineInstance);
            expect(element.polylineInstance.parent).toBe(parent1.node);

            parent2.appendChild(element);
            expect(parent1.node.children).not.toContain(element.polylineInstance);
            expect(parent2.node.children).toContain(element.polylineInstance);
            expect(element.polylineInstance.parent).toBe(parent2.node);

            parent1.remove();
            parent2.remove();
        });

        it("should ignore redundant parent updates when same parent node is re-emitted", () => {
            const sceneElement = document.createElement(TAG_RJ_SCENE);
            document.body.appendChild(sceneElement);

            const addChildSpy = vi.spyOn(sceneElement.scene, "addChild");
            sceneElement.appendChild(element);

            expect(addChildSpy).toHaveBeenCalledTimes(1);

            sceneElement.requestUpdate();

            expect(addChildSpy).toHaveBeenCalledTimes(1);
            expect(sceneElement.scene.children).toContain(element.polylineInstance);

            sceneElement.remove();
        });
    });

    describe("lifecycle and connection handling", () => {
        it("should refresh context provider value upon reconnection to DOM", () => {
            element.remove();

            const childConsumer = document.createElement(
                "test-polyline-child-consumer"
            ) as TestPolylineChildConsumerElement;
            element.appendChild(childConsumer);

            document.body.appendChild(element);

            expect(childConsumer.parentValue).toBe(element.polylineInstance);

            childConsumer.remove();
        });

        it("should handle disconnection cleanly without throwing when not attached to a parent", () => {
            expect(() => {
                element.remove();
            }).not.toThrow();
        });
    });
});
