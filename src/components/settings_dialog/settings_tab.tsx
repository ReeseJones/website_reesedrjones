import type { SettingsTabProps } from "./settings_dialog_types";

/**
 * Declarative tab element for SettingsDialog children.
 * Renders its child contents when active within SettingsDialog.
 */
export function SettingsTab(props: SettingsTabProps): React.JSX.Element {
    return <>{props.children}</>;
}
