import { describe, it, expect } from "vitest";
import { createEnumConverter } from "./enum_converter";
import { BillboardMode, SpriteSizeMode } from "../../scene/sprites/sprite_instance_types";

enum MockStatus {
    Idle = "idle",
    PendingApproval = "pending-approval",
    Completed = "completed",
}

enum MockPriority {
    LowPriority = "LOW_PRIORITY",
    HighPriority = "HIGH_PRIORITY",
}

describe("createEnumConverter()", () => {
    describe("numeric enums", () => {
        describe("SpriteSizeMode converter", () => {
            const converter = createEnumConverter(SpriteSizeMode, SpriteSizeMode.ScreenSpace);

            describe("fromAttribute()", () => {
                it("should parse exact kebab-case string into enum value", () => {
                    expect(converter.fromAttribute("screen-space")).toBe(SpriteSizeMode.ScreenSpace);
                    expect(converter.fromAttribute("world-space")).toBe(SpriteSizeMode.WorldSpace);
                    expect(converter.fromAttribute("clamped-screen-space")).toBe(SpriteSizeMode.ClampedScreenSpace);
                });

                it("should parse camelCase string into enum value", () => {
                    expect(converter.fromAttribute("screenSpace")).toBe(SpriteSizeMode.ScreenSpace);
                    expect(converter.fromAttribute("worldSpace")).toBe(SpriteSizeMode.WorldSpace);
                    expect(converter.fromAttribute("clampedScreenSpace")).toBe(SpriteSizeMode.ClampedScreenSpace);
                });

                it("should parse PascalCase string into enum value", () => {
                    expect(converter.fromAttribute("ScreenSpace")).toBe(SpriteSizeMode.ScreenSpace);
                    expect(converter.fromAttribute("WorldSpace")).toBe(SpriteSizeMode.WorldSpace);
                    expect(converter.fromAttribute("ClampedScreenSpace")).toBe(SpriteSizeMode.ClampedScreenSpace);
                });

                it("should parse SCREAMING_SNAKE_CASE string into enum value", () => {
                    expect(converter.fromAttribute("SCREEN_SPACE")).toBe(SpriteSizeMode.ScreenSpace);
                    expect(converter.fromAttribute("WORLD_SPACE")).toBe(SpriteSizeMode.WorldSpace);
                    expect(converter.fromAttribute("CLAMPED_SCREEN_SPACE")).toBe(SpriteSizeMode.ClampedScreenSpace);
                });

                it("should parse mixed-case and hyphens into enum value", () => {
                    expect(converter.fromAttribute("Clamped-Screen-Space")).toBe(SpriteSizeMode.ClampedScreenSpace);
                    expect(converter.fromAttribute("World-Space")).toBe(SpriteSizeMode.WorldSpace);
                });

                it("should reject raw numeric strings and return defaultValue", () => {
                    expect(converter.fromAttribute("0")).toBe(SpriteSizeMode.ScreenSpace);
                    expect(converter.fromAttribute("1")).toBe(SpriteSizeMode.ScreenSpace);
                    expect(converter.fromAttribute("2")).toBe(SpriteSizeMode.ScreenSpace);
                    expect(converter.fromAttribute("99")).toBe(SpriteSizeMode.ScreenSpace);
                });

                it("should return defaultValue for unknown or invalid strings", () => {
                    expect(converter.fromAttribute("invalid-mode")).toBe(SpriteSizeMode.ScreenSpace);
                    expect(converter.fromAttribute("unknown")).toBe(SpriteSizeMode.ScreenSpace);
                });

                it("should return defaultValue for null, empty, or whitespace-only inputs", () => {
                    expect(converter.fromAttribute(null)).toBe(SpriteSizeMode.ScreenSpace);
                    expect(converter.fromAttribute("")).toBe(SpriteSizeMode.ScreenSpace);
                    expect(converter.fromAttribute("   ")).toBe(SpriteSizeMode.ScreenSpace);
                    expect(converter.fromAttribute(undefined as unknown as string)).toBe(SpriteSizeMode.ScreenSpace);
                });
            });

            describe("toAttribute()", () => {
                it("should serialize numeric enum value to kebab-case string", () => {
                    expect(converter.toAttribute(SpriteSizeMode.ScreenSpace)).toBe("screen-space");
                    expect(converter.toAttribute(SpriteSizeMode.WorldSpace)).toBe("world-space");
                    expect(converter.toAttribute(SpriteSizeMode.ClampedScreenSpace)).toBe("clamped-screen-space");
                });

                it("should return null for null or undefined input", () => {
                    expect(converter.toAttribute(null as unknown as SpriteSizeMode)).toBeNull();
                    expect(converter.toAttribute(undefined as unknown as SpriteSizeMode)).toBeNull();
                });

                it("should return null for unrecognized enum numbers", () => {
                    expect(converter.toAttribute(999 as SpriteSizeMode)).toBeNull();
                });
            });
        });

        describe("BillboardMode converter", () => {
            const converter = createEnumConverter(BillboardMode, BillboardMode.Spherical);

            describe("fromAttribute()", () => {
                it("should parse kebab-case and case variations into BillboardMode", () => {
                    expect(converter.fromAttribute("spherical")).toBe(BillboardMode.Spherical);
                    expect(converter.fromAttribute("cylindrical")).toBe(BillboardMode.Cylindrical);
                    expect(converter.fromAttribute("Spherical")).toBe(BillboardMode.Spherical);
                    expect(converter.fromAttribute("CYLINDRICAL")).toBe(BillboardMode.Cylindrical);
                });

                it("should reject raw numeric strings and fallback to defaultValue", () => {
                    expect(converter.fromAttribute("0")).toBe(BillboardMode.Spherical);
                    expect(converter.fromAttribute("1")).toBe(BillboardMode.Spherical);
                });

                it("should fallback unknown mode like axial-y to defaultValue", () => {
                    expect(converter.fromAttribute("axial-y")).toBe(BillboardMode.Spherical);
                });
            });

            describe("toAttribute()", () => {
                it("should serialize BillboardMode to kebab-case string", () => {
                    expect(converter.toAttribute(BillboardMode.Spherical)).toBe("spherical");
                    expect(converter.toAttribute(BillboardMode.Cylindrical)).toBe("cylindrical");
                });
            });
        });
    });

    describe("string enums", () => {
        describe("kebab-case value string enum", () => {
            const converter = createEnumConverter<MockStatus>(MockStatus, MockStatus.Idle);

            describe("fromAttribute()", () => {
                it("should parse kebab-case, camelCase, and PascalCase into string enum value", () => {
                    expect(converter.fromAttribute("pending-approval")).toBe(MockStatus.PendingApproval);
                    expect(converter.fromAttribute("pendingApproval")).toBe(MockStatus.PendingApproval);
                    expect(converter.fromAttribute("PendingApproval")).toBe(MockStatus.PendingApproval);
                    expect(converter.fromAttribute("idle")).toBe(MockStatus.Idle);
                    expect(converter.fromAttribute("completed")).toBe(MockStatus.Completed);
                });

                it("should return defaultValue for unknown strings", () => {
                    expect(converter.fromAttribute("in-progress")).toBe(MockStatus.Idle);
                });

                it("should return defaultValue for null or empty strings", () => {
                    expect(converter.fromAttribute(null)).toBe(MockStatus.Idle);
                    expect(converter.fromAttribute("")).toBe(MockStatus.Idle);
                });
            });

            describe("toAttribute()", () => {
                it("should serialize string enum value to kebab-case string", () => {
                    expect(converter.toAttribute(MockStatus.PendingApproval)).toBe("pending-approval");
                    expect(converter.toAttribute(MockStatus.Idle)).toBe("idle");
                    expect(converter.toAttribute(MockStatus.Completed)).toBe("completed");
                });

                it("should return null for null or undefined", () => {
                    expect(converter.toAttribute(null as unknown as MockStatus)).toBeNull();
                    expect(converter.toAttribute(undefined as unknown as MockStatus)).toBeNull();
                });
            });
        });

        describe("screaming snake case value string enum", () => {
            const converter = createEnumConverter<MockPriority>(MockPriority, MockPriority.LowPriority);

            describe("fromAttribute()", () => {
                it("should match screaming snake case values as well as kebab keys", () => {
                    expect(converter.fromAttribute("low-priority")).toBe(MockPriority.LowPriority);
                    expect(converter.fromAttribute("LOW_PRIORITY")).toBe(MockPriority.LowPriority);
                    expect(converter.fromAttribute("highPriority")).toBe(MockPriority.HighPriority);
                    expect(converter.fromAttribute("HIGH_PRIORITY")).toBe(MockPriority.HighPriority);
                });
            });

            describe("toAttribute()", () => {
                it("should serialize screaming snake case enum value to kebab-case string", () => {
                    expect(converter.toAttribute(MockPriority.LowPriority)).toBe("low-priority");
                    expect(converter.toAttribute(MockPriority.HighPriority)).toBe("high-priority");
                });
            });
        });
    });
});
