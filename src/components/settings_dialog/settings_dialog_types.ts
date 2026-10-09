import type { ReactNode, Ref } from "react";

export const DEFAULT_ACTIVE_TAB_ID = "general";
export const DEFAULT_DIALOG_TITLE = "Settings";
export const ROLE_TAB = "tab";
export const ROLE_TABLIST = "tablist";
export const ROLE_TABPANEL = "tabpanel";

/**
 * Props for the declarative SettingsTab child element.
 */
export interface SettingsTabProps {
    /** Unique identifier for the tab */
    id: string;
    /** Human-readable tab label */
    label: string;
    /** Optional leading tab icon */
    icon?: ReactNode;
    /** Optional badge or counter indicator */
    badge?: string | number;
    /** Whether the tab is disabled and cannot be activated */
    disabled?: boolean;
    /** Panel content rendered when this tab is active */
    children: ReactNode;
}

/**
 * Data descriptor representing a configured tab.
 */
export interface SettingsTabDescriptor {
    /** Unique identifier for the tab */
    id: string;
    /** Human-readable tab label */
    label: string;
    /** Optional leading tab icon */
    icon?: ReactNode;
    /** Optional badge or counter indicator */
    badge?: string | number;
    /** Whether the tab is disabled and cannot be activated */
    disabled?: boolean;
    /** Panel content rendered when this tab is active */
    content: ReactNode;
}

/**
 * Props for the SettingsDialog component.
 */
export interface SettingsDialogProps {
    /** Modal visibility state */
    isOpen: boolean;
    /** Callback invoked when closing the dialog modal */
    onClose: () => void;
    /** Controlled active tab ID */
    activeTabId?: string;
    /** Initial active tab ID for uncontrolled mode (defaults to "general") */
    defaultTabId?: string;
    /** Callback emitted when the active tab changes */
    onTabChange?: (tabId: string) => void;
    /** Optional programmatic tab descriptors */
    tabs?: SettingsTabDescriptor[];
    /** Declarative SettingsTab child elements */
    children?: ReactNode;
    /** Optional dialog root CSS class name */
    className?: string;
    /** Modal header title (defaults to "Settings") */
    title?: string;
}
