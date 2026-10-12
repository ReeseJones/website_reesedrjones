import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { GeneralSettingsSection } from "./general_settings_section";
import { SiteSettingsProvider } from "../../settings/site_settings_context";
import { DEFAULT_SITE_SETTINGS, type SiteSettings } from "../../settings/site_settings_types";

describe("<GeneralSettingsSection />", () => {
    beforeEach(() => {
        window.localStorage.clear();
        vi.restoreAllMocks();
    });

    describe("explicit props mode", () => {
        it("renders section title, setting label, and description copy", () => {
            const onChange = vi.fn();
            render(
                <GeneralSettingsSection
                    settings={DEFAULT_SITE_SETTINGS}
                    onChange={onChange}
                />
            );

            expect(
                screen.getByText("Diagnostics & Performance")
            ).toBeInTheDocument();
            expect(screen.getByText("Show FPS Counter")).toBeInTheDocument();
            expect(
                screen.getByText(
                    "Displays real-time WebGL frame rate, frame delta, and render duration."
                )
            ).toBeInTheDocument();
        });

        it("renders switch unchecked when settings.debug.showFps is false", () => {
            const onChange = vi.fn();
            render(
                <GeneralSettingsSection
                    settings={DEFAULT_SITE_SETTINGS}
                    onChange={onChange}
                />
            );

            const toggle = screen.getByRole("switch", {
                name: "Show FPS Counter",
            });
            expect(toggle).toBeInTheDocument();
            expect(toggle).not.toBeChecked();
            expect(toggle).toHaveAttribute("aria-checked", "false");
        });

        it("renders switch checked when settings.debug.showFps is true", () => {
            const onChange = vi.fn();
            const activeSettings: SiteSettings = {
                debug: { showFps: true },
            };
            render(
                <GeneralSettingsSection
                    settings={activeSettings}
                    onChange={onChange}
                />
            );

            const toggle = screen.getByRole("switch", {
                name: "Show FPS Counter",
            });
            expect(toggle).toBeChecked();
            expect(toggle).toHaveAttribute("aria-checked", "true");
        });

        it("dispatches onChange with debug.showFps=true when user clicks unchecked switch", async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();
            render(
                <GeneralSettingsSection
                    settings={DEFAULT_SITE_SETTINGS}
                    onChange={onChange}
                />
            );

            const toggle = screen.getByRole("switch", {
                name: "Show FPS Counter",
            });
            await user.click(toggle);

            expect(onChange).toHaveBeenCalledTimes(1);
            expect(onChange).toHaveBeenCalledWith({
                debug: {
                    showFps: true,
                },
            });
        });

        it("dispatches onChange with debug.showFps=false when user clicks checked switch", async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();
            const activeSettings: SiteSettings = {
                debug: { showFps: true },
            };
            render(
                <GeneralSettingsSection
                    settings={activeSettings}
                    onChange={onChange}
                />
            );

            const toggle = screen.getByRole("switch", {
                name: "Show FPS Counter",
            });
            await user.click(toggle);

            expect(onChange).toHaveBeenCalledTimes(1);
            expect(onChange).toHaveBeenCalledWith({
                debug: {
                    showFps: false,
                },
            });
        });

        it("renders 'Reset General Defaults' button and invokes onReset when clicked", async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();
            const onReset = vi.fn();

            render(
                <GeneralSettingsSection
                    settings={DEFAULT_SITE_SETTINGS}
                    onChange={onChange}
                    onReset={onReset}
                />
            );

            const resetBtn = screen.getByRole("button", {
                name: "Reset General Defaults",
            });
            expect(resetBtn).toBeInTheDocument();

            await user.click(resetBtn);
            expect(onReset).toHaveBeenCalledTimes(1);
        });

        it("does not render reset button if onReset prop is omitted", () => {
            const onChange = vi.fn();
            render(
                <GeneralSettingsSection
                    settings={DEFAULT_SITE_SETTINGS}
                    onChange={onChange}
                />
            );

            expect(
                screen.queryByRole("button", {
                    name: "Reset General Defaults",
                })
            ).toBeNull();
        });
    });

    describe("ambient SiteSettingsProvider mode", () => {
        it("consumes settings and updateSettings from ambient SiteSettingsProvider", async () => {
            const user = userEvent.setup();

            render(
                <SiteSettingsProvider storageKey={null}>
                    <GeneralSettingsSection />
                </SiteSettingsProvider>
            );

            const toggle = screen.getByRole("switch", {
                name: "Show FPS Counter",
            });
            expect(toggle).not.toBeChecked();

            await user.click(toggle);
            expect(toggle).toBeChecked();

            await user.click(toggle);
            expect(toggle).not.toBeChecked();
        });

        it("reverts settings when clicking 'Reset General Defaults' button in ambient context", async () => {
            const user = userEvent.setup();

            render(
                <SiteSettingsProvider
                    storageKey={null}
                    initialSettings={{ debug: { showFps: true } }}
                >
                    <GeneralSettingsSection />
                </SiteSettingsProvider>
            );

            const toggle = screen.getByRole("switch", {
                name: "Show FPS Counter",
            });
            expect(toggle).toBeChecked();

            const resetBtn = screen.getByRole("button", {
                name: "Reset General Defaults",
            });
            await user.click(resetBtn);

            expect(toggle).not.toBeChecked();
        });
    });

    describe("missing context or props guard", () => {
        it("throws an error when rendered without props and outside SiteSettingsProvider", () => {
            const consoleSpy = vi
                .spyOn(console, "error")
                .mockImplementation(() => {});

            expect(() => {
                render(<GeneralSettingsSection />);
            }).toThrow(
                "GeneralSettingsSection requires either explicit settings/onChange props or an enclosing SiteSettingsProvider"
            );

            consoleSpy.mockRestore();
        });
    });
});
