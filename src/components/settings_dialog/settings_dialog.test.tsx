import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React, { useState } from "react";
import { SettingsDialog } from "./settings_dialog";
import { SettingsTab } from "./settings_tab";
import type { SettingsTabDescriptor } from "./settings_dialog_types";

describe("<SettingsTab />", () => {
    it("renders children directly as a React fragment", () => {
        render(
            <SettingsTab id="test" label="Test">
                <span data-testid="tab-child">Child Content</span>
            </SettingsTab>
        );

        expect(screen.getByTestId("tab-child")).toBeInTheDocument();
        expect(screen.getByTestId("tab-child")).toHaveTextContent("Child Content");
    });
});

describe("<SettingsDialog />", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    describe("modal lifecycle & header controls", () => {
        it("renders modal dialog open with default title and close button", () => {
            const onClose = vi.fn();
            render(
                <SettingsDialog isOpen={true} onClose={onClose}>
                    <SettingsTab id="general" label="General">
                        <div>General Body</div>
                    </SettingsTab>
                </SettingsDialog>
            );

            expect(screen.getByText("Settings")).toBeInTheDocument();
            const closeBtn = screen.getByRole("button", {
                name: "Close dialog",
            });
            expect(closeBtn).toBeInTheDocument();
        });

        it("renders custom title when specified", () => {
            const onClose = vi.fn();
            render(
                <SettingsDialog
                    isOpen={true}
                    onClose={onClose}
                    title="User Preferences"
                >
                    <SettingsTab id="general" label="General">
                        <div>General Body</div>
                    </SettingsTab>
                </SettingsDialog>
            );

            expect(screen.getByText("User Preferences")).toBeInTheDocument();
        });

        it("invokes onClose when clicking the close button", async () => {
            const user = userEvent.setup();
            const onClose = vi.fn();

            render(
                <SettingsDialog isOpen={true} onClose={onClose}>
                    <SettingsTab id="general" label="General">
                        <div>General Body</div>
                    </SettingsTab>
                </SettingsDialog>
            );

            const closeBtn = screen.getByRole("button", {
                name: "Close dialog",
            });
            await user.click(closeBtn);

            expect(onClose).toHaveBeenCalledTimes(1);
        });

        it("applies custom className to dialog wrapper", () => {
            const onClose = vi.fn();
            const { container } = render(
                <SettingsDialog
                    isOpen={true}
                    onClose={onClose}
                    className="custom-settings-theme"
                >
                    <SettingsTab id="general" label="General">
                        <div>General Body</div>
                    </SettingsTab>
                </SettingsDialog>
            );

            const dialog = container.querySelector("dialog");
            expect(dialog).toHaveClass("settings-dialog", "custom-settings-theme");
        });
    });

    describe("declarative children and programmatic tabs prop", () => {
        it("renders tabs declaratively via <SettingsTab> children", () => {
            const onClose = vi.fn();
            render(
                <SettingsDialog isOpen={true} onClose={onClose}>
                    <SettingsTab id="tab1" label="Tab One">
                        <div>Content One</div>
                    </SettingsTab>
                    <SettingsTab id="tab2" label="Tab Two">
                        <div>Content Two</div>
                    </SettingsTab>
                </SettingsDialog>
            );

            const tablist = screen.getByRole("tablist", {
                name: "Settings categories",
            });
            expect(tablist).toBeInTheDocument();

            const tabButtons = screen.getAllByRole("tab");
            expect(tabButtons).toHaveLength(2);
            expect(tabButtons[0]).toHaveTextContent("Tab One");
            expect(tabButtons[1]).toHaveTextContent("Tab Two");
        });

        it("renders tabs programmatically via tabs prop", () => {
            const onClose = vi.fn();
            const programmaticTabs: SettingsTabDescriptor[] = [
                { id: "graphics", label: "Graphics", content: <div>Graphics Options</div> },
                { id: "audio", label: "Audio", content: <div>Audio Options</div> },
            ];

            render(
                <SettingsDialog
                    isOpen={true}
                    onClose={onClose}
                    tabs={programmaticTabs}
                />
            );

            const tabButtons = screen.getAllByRole("tab");
            expect(tabButtons).toHaveLength(2);
            expect(tabButtons[0]).toHaveTextContent("Graphics");
            expect(tabButtons[1]).toHaveTextContent("Audio");
            expect(screen.getByRole("tabpanel")).toHaveTextContent("Graphics Options");
        });

        it("combines programmatic tabs and declarative children, placing programmatic tabs first", () => {
            const onClose = vi.fn();
            const programmaticTabs: SettingsTabDescriptor[] = [
                { id: "prog1", label: "Programmatic Tab", content: <div>Prog Content</div> },
            ];

            render(
                <SettingsDialog
                    isOpen={true}
                    onClose={onClose}
                    tabs={programmaticTabs}
                >
                    <SettingsTab id="decl1" label="Declarative Tab">
                        <div>Decl Content</div>
                    </SettingsTab>
                </SettingsDialog>
            );

            const tabButtons = screen.getAllByRole("tab");
            expect(tabButtons).toHaveLength(2);
            expect(tabButtons[0]).toHaveTextContent("Programmatic Tab");
            expect(tabButtons[1]).toHaveTextContent("Declarative Tab");
        });

        it("renders tab icons and badges when provided", () => {
            const onClose = vi.fn();
            render(
                <SettingsDialog isOpen={true} onClose={onClose}>
                    <SettingsTab
                        id="tab1"
                        label="Features"
                        icon={<span data-testid="star-icon">★</span>}
                        badge="New"
                    >
                        <div>Features Content</div>
                    </SettingsTab>
                    <SettingsTab
                        id="tab2"
                        label="Notifications"
                        badge={3}
                    >
                        <div>Notifications Content</div>
                    </SettingsTab>
                </SettingsDialog>
            );

            expect(screen.getByTestId("star-icon")).toBeInTheDocument();
            expect(screen.getByText("New")).toHaveClass("tab-badge");
            expect(screen.getByText("3")).toHaveClass("tab-badge");
        });
    });

    describe("uncontrolled tab switching", () => {
        it("activates defaultTabId or first tab initially", () => {
            const onClose = vi.fn();
            render(
                <SettingsDialog
                    isOpen={true}
                    onClose={onClose}
                    defaultTabId="audio"
                >
                    <SettingsTab id="general" label="General">
                        <div>General Content</div>
                    </SettingsTab>
                    <SettingsTab id="audio" label="Audio">
                        <div>Audio Content</div>
                    </SettingsTab>
                </SettingsDialog>
            );

            const audioTab = screen.getByRole("tab", { name: "Audio" });
            const generalTab = screen.getByRole("tab", { name: "General" });

            expect(audioTab).toHaveAttribute("aria-selected", "true");
            expect(audioTab).toHaveAttribute("tabindex", "0");
            expect(generalTab).toHaveAttribute("aria-selected", "false");
            expect(generalTab).toHaveAttribute("tabindex", "-1");

            const panel = screen.getByRole("tabpanel");
            expect(panel).toHaveTextContent("Audio Content");
            expect(panel).toHaveAttribute("aria-labelledby", "settings-tab-audio");
        });

        it("switches active tab and panel content upon clicking another tab button", async () => {
            const user = userEvent.setup();
            const onClose = vi.fn();
            const onTabChange = vi.fn();

            render(
                <SettingsDialog
                    isOpen={true}
                    onClose={onClose}
                    onTabChange={onTabChange}
                >
                    <SettingsTab id="general" label="General">
                        <div>General Content</div>
                    </SettingsTab>
                    <SettingsTab id="graphics" label="Graphics">
                        <div>Graphics Content</div>
                    </SettingsTab>
                </SettingsDialog>
            );

            expect(screen.getByRole("tabpanel")).toHaveTextContent("General Content");

            const graphicsTab = screen.getByRole("tab", { name: "Graphics" });
            await user.click(graphicsTab);

            expect(onTabChange).toHaveBeenCalledTimes(1);
            expect(onTabChange).toHaveBeenCalledWith("graphics");

            expect(graphicsTab).toHaveAttribute("aria-selected", "true");
            expect(screen.getByRole("tabpanel")).toHaveTextContent("Graphics Content");
        });
    });

    describe("controlled tab switching", () => {
        it("displays panel corresponding to activeTabId prop", () => {
            const onClose = vi.fn();
            render(
                <SettingsDialog
                    isOpen={true}
                    onClose={onClose}
                    activeTabId="display"
                >
                    <SettingsTab id="general" label="General">
                        <div>General Content</div>
                    </SettingsTab>
                    <SettingsTab id="display" label="Display">
                        <div>Display Content</div>
                    </SettingsTab>
                </SettingsDialog>
            );

            const displayTab = screen.getByRole("tab", { name: "Display" });
            expect(displayTab).toHaveAttribute("aria-selected", "true");
            expect(screen.getByRole("tabpanel")).toHaveTextContent("Display Content");
        });

        it("invokes onTabChange but does not alter panel if parent does not update activeTabId", async () => {
            const user = userEvent.setup();
            const onClose = vi.fn();
            const onTabChange = vi.fn();

            render(
                <SettingsDialog
                    isOpen={true}
                    onClose={onClose}
                    activeTabId="general"
                    onTabChange={onTabChange}
                >
                    <SettingsTab id="general" label="General">
                        <div>General Content</div>
                    </SettingsTab>
                    <SettingsTab id="display" label="Display">
                        <div>Display Content</div>
                    </SettingsTab>
                </SettingsDialog>
            );

            const displayTab = screen.getByRole("tab", { name: "Display" });
            await user.click(displayTab);

            expect(onTabChange).toHaveBeenCalledWith("display");
            // Still "General Content" because activeTabId prop was not updated by parent
            expect(screen.getByRole("tabpanel")).toHaveTextContent("General Content");
        });

        it("updates rendered panel when controlled activeTabId changes in parent state", async () => {
            const user = userEvent.setup();

            function ControlledContainer() {
                const [activeTab, setActiveTab] = useState("general");
                return (
                    <SettingsDialog
                        isOpen={true}
                        onClose={vi.fn()}
                        activeTabId={activeTab}
                        onTabChange={setActiveTab}
                    >
                        <SettingsTab id="general" label="General">
                            <div>General Content</div>
                        </SettingsTab>
                        <SettingsTab id="display" label="Display">
                            <div>Display Content</div>
                        </SettingsTab>
                    </SettingsDialog>
                );
            }

            render(<ControlledContainer />);

            expect(screen.getByRole("tabpanel")).toHaveTextContent("General Content");

            const displayTab = screen.getByRole("tab", { name: "Display" });
            await user.click(displayTab);

            expect(displayTab).toHaveAttribute("aria-selected", "true");
            expect(screen.getByRole("tabpanel")).toHaveTextContent("Display Content");
        });
    });

    describe("disabled tabs handling", () => {
        it("renders disabled tab with disabled attribute and does not activate on click", async () => {
            const user = userEvent.setup();
            const onClose = vi.fn();
            const onTabChange = vi.fn();

            render(
                <SettingsDialog
                    isOpen={true}
                    onClose={onClose}
                    onTabChange={onTabChange}
                >
                    <SettingsTab id="general" label="General">
                        <div>General Content</div>
                    </SettingsTab>
                    <SettingsTab id="experimental" label="Experimental" disabled>
                        <div>Experimental Content</div>
                    </SettingsTab>
                </SettingsDialog>
            );

            const disabledTab = screen.getByRole("tab", { name: "Experimental" });
            expect(disabledTab).toBeDisabled();

            await user.click(disabledTab);
            expect(onTabChange).not.toHaveBeenCalled();
            expect(screen.getByRole("tabpanel")).toHaveTextContent("General Content");
        });

        it("falls back to first enabled tab if defaultTabId points to a disabled tab", () => {
            const onClose = vi.fn();
            render(
                <SettingsDialog
                    isOpen={true}
                    onClose={onClose}
                    defaultTabId="disabledTab"
                >
                    <SettingsTab id="disabledTab" label="Disabled" disabled>
                        <div>Disabled Content</div>
                    </SettingsTab>
                    <SettingsTab id="enabledTab" label="Enabled">
                        <div>Enabled Content</div>
                    </SettingsTab>
                </SettingsDialog>
            );

            const enabledTab = screen.getByRole("tab", { name: "Enabled" });
            expect(enabledTab).toHaveAttribute("aria-selected", "true");
            expect(screen.getByRole("tabpanel")).toHaveTextContent("Enabled Content");
        });
    });

    describe("keyboard navigation across tabs", () => {
        it("moves to next tab on ArrowRight and wraps around from last to first", async () => {
            const user = userEvent.setup();
            const onClose = vi.fn();
            const onTabChange = vi.fn();

            render(
                <SettingsDialog
                    isOpen={true}
                    onClose={onClose}
                    onTabChange={onTabChange}
                >
                    <SettingsTab id="tab1" label="Tab 1">
                        <div>Panel 1</div>
                    </SettingsTab>
                    <SettingsTab id="tab2" label="Tab 2">
                        <div>Panel 2</div>
                    </SettingsTab>
                    <SettingsTab id="tab3" label="Tab 3">
                        <div>Panel 3</div>
                    </SettingsTab>
                </SettingsDialog>
            );

            const tab1 = screen.getByRole("tab", { name: "Tab 1" });
            const tab2 = screen.getByRole("tab", { name: "Tab 2" });
            const tab3 = screen.getByRole("tab", { name: "Tab 3" });

            tab1.focus();
            expect(tab1).toHaveFocus();

            await user.keyboard("{ArrowRight}");
            expect(tab2).toHaveFocus();
            expect(tab2).toHaveAttribute("aria-selected", "true");
            expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel 2");

            await user.keyboard("{ArrowRight}");
            expect(tab3).toHaveFocus();
            expect(tab3).toHaveAttribute("aria-selected", "true");
            expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel 3");

            // Wrap around to Tab 1
            await user.keyboard("{ArrowRight}");
            expect(tab1).toHaveFocus();
            expect(tab1).toHaveAttribute("aria-selected", "true");
            expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel 1");
        });

        it("moves to previous tab on ArrowLeft and wraps around from first to last", async () => {
            const user = userEvent.setup();
            const onClose = vi.fn();

            render(
                <SettingsDialog isOpen={true} onClose={onClose}>
                    <SettingsTab id="tab1" label="Tab 1">
                        <div>Panel 1</div>
                    </SettingsTab>
                    <SettingsTab id="tab2" label="Tab 2">
                        <div>Panel 2</div>
                    </SettingsTab>
                    <SettingsTab id="tab3" label="Tab 3">
                        <div>Panel 3</div>
                    </SettingsTab>
                </SettingsDialog>
            );

            const tab1 = screen.getByRole("tab", { name: "Tab 1" });
            const tab3 = screen.getByRole("tab", { name: "Tab 3" });

            tab1.focus();

            // ArrowLeft on first tab wraps to last tab (tab3)
            await user.keyboard("{ArrowLeft}");
            expect(tab3).toHaveFocus();
            expect(tab3).toHaveAttribute("aria-selected", "true");
            expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel 3");
        });

        it("skips disabled tabs when navigating with arrow keys", async () => {
            const user = userEvent.setup();
            const onClose = vi.fn();

            render(
                <SettingsDialog isOpen={true} onClose={onClose}>
                    <SettingsTab id="tab1" label="Tab 1">
                        <div>Panel 1</div>
                    </SettingsTab>
                    <SettingsTab id="tab2" label="Tab 2" disabled>
                        <div>Panel 2</div>
                    </SettingsTab>
                    <SettingsTab id="tab3" label="Tab 3">
                        <div>Panel 3</div>
                    </SettingsTab>
                </SettingsDialog>
            );

            const tab1 = screen.getByRole("tab", { name: "Tab 1" });
            const tab3 = screen.getByRole("tab", { name: "Tab 3" });

            tab1.focus();

            // ArrowRight should skip tab2 and land directly on tab3
            await user.keyboard("{ArrowRight}");
            expect(tab3).toHaveFocus();
            expect(tab3).toHaveAttribute("aria-selected", "true");
            expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel 3");

            // ArrowLeft should skip tab2 and land back on tab1
            await user.keyboard("{ArrowLeft}");
            expect(tab1).toHaveFocus();
            expect(tab1).toHaveAttribute("aria-selected", "true");
        });

        it("moves to first tab on Home key and last tab on End key", async () => {
            const user = userEvent.setup();
            const onClose = vi.fn();

            render(
                <SettingsDialog
                    isOpen={true}
                    onClose={onClose}
                    defaultTabId="tab2"
                >
                    <SettingsTab id="tab1" label="Tab 1">
                        <div>Panel 1</div>
                    </SettingsTab>
                    <SettingsTab id="tab2" label="Tab 2">
                        <div>Panel 2</div>
                    </SettingsTab>
                    <SettingsTab id="tab3" label="Tab 3">
                        <div>Panel 3</div>
                    </SettingsTab>
                </SettingsDialog>
            );

            const tab1 = screen.getByRole("tab", { name: "Tab 1" });
            const tab2 = screen.getByRole("tab", { name: "Tab 2" });
            const tab3 = screen.getByRole("tab", { name: "Tab 3" });

            tab2.focus();

            await user.keyboard("{Home}");
            expect(tab1).toHaveFocus();
            expect(tab1).toHaveAttribute("aria-selected", "true");
            expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel 1");

            await user.keyboard("{End}");
            expect(tab3).toHaveFocus();
            expect(tab3).toHaveAttribute("aria-selected", "true");
            expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel 3");
        });
    });
});
