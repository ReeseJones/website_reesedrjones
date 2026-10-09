import "./settings_dialog.scss";

import React, {
    useCallback,
    useMemo,
    useRef,
    useState,
} from "react";
import { Dialog } from "../dialog/dialog";
import { GearIcon } from "../icons/gear_icon";
import { classNameMap } from "../../lib/classNameMap";
import {
    DEFAULT_ACTIVE_TAB_ID,
    DEFAULT_DIALOG_TITLE,
    ROLE_TAB,
    ROLE_TABLIST,
    ROLE_TABPANEL,
    type SettingsDialogProps,
    type SettingsTabDescriptor,
    type SettingsTabProps,
} from "./settings_dialog_types";

const KEY_ARROW_LEFT = "ArrowLeft";
const KEY_ARROW_RIGHT = "ArrowRight";
const KEY_HOME = "Home";
const KEY_END = "End";

/**
 * Generalized, accessible settings dialog modal supporting declarative and programmatic tabs.
 */
export function SettingsDialog(props: SettingsDialogProps): React.JSX.Element {
    const {
        isOpen,
        onClose,
        activeTabId,
        defaultTabId = DEFAULT_ACTIVE_TAB_ID,
        onTabChange,
        tabs,
        children,
        className,
        title = DEFAULT_DIALOG_TITLE,
    } = props;

    // Collect tab descriptors from programmatic tabs prop and declarative children
    const tabDescriptors = useMemo<SettingsTabDescriptor[]>(() => {
        const items: SettingsTabDescriptor[] = [];

        if (tabs) {
            items.push(...tabs);
        }

        React.Children.forEach(children, (child) => {
            if (React.isValidElement<SettingsTabProps>(child)) {
                const {
                    id,
                    label,
                    icon,
                    badge,
                    disabled,
                    children: tabContent,
                } = child.props;

                if (id) {
                    items.push({
                        id,
                        label: label ?? id,
                        icon,
                        badge,
                        disabled,
                        content: tabContent,
                    });
                }
            }
        });

        return items;
    }, [tabs, children]);

    const [uncontrolledTabId, setUncontrolledTabId] = useState<string>(defaultTabId);
    const isControlled = activeTabId !== undefined;
    const currentTabId = isControlled ? activeTabId : uncontrolledTabId;

    const activeTab = useMemo<SettingsTabDescriptor | undefined>(() => {
        if (tabDescriptors.length === 0) {
            return undefined;
        }
        const found = tabDescriptors.find(
            (tab) => tab.id === currentTabId && !tab.disabled
        );
        if (found) {
            return found;
        }
        return (
            tabDescriptors.find((tab) => !tab.disabled) ?? tabDescriptors[0]
        );
    }, [tabDescriptors, currentTabId]);

    const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

    const handleSelectTab = useCallback(
        (id: string) => {
            if (!isControlled) {
                setUncontrolledTabId(id);
            }
            onTabChange?.(id);
        },
        [isControlled, onTabChange]
    );

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLDivElement>) => {
            const enabledTabs = tabDescriptors.filter((t) => !t.disabled);
            if (enabledTabs.length === 0) {
                return;
            }

            const currentIndex = enabledTabs.findIndex(
                (t) => t.id === activeTab?.id
            );

            let nextIndex = -1;

            if (e.key === KEY_ARROW_RIGHT) {
                nextIndex =
                    currentIndex >= 0
                        ? (currentIndex + 1) % enabledTabs.length
                        : 0;
            } else if (e.key === KEY_ARROW_LEFT) {
                nextIndex =
                    currentIndex >= 0
                        ? (currentIndex - 1 + enabledTabs.length) %
                          enabledTabs.length
                        : enabledTabs.length - 1;
            } else if (e.key === KEY_HOME) {
                nextIndex = 0;
            } else if (e.key === KEY_END) {
                nextIndex = enabledTabs.length - 1;
            }

            if (nextIndex >= 0) {
                e.preventDefault();
                const targetTab = enabledTabs[nextIndex];
                handleSelectTab(targetTab.id);
                const targetBtn = tabRefs.current.get(targetTab.id);
                targetBtn?.focus();
            }
        },
        [tabDescriptors, activeTab, handleSelectTab]
    );

    const rootClasses = classNameMap({
        "settings-dialog": true,
        [className ?? ""]: Boolean(className),
    });

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            onClick={onClose}
            className={rootClasses}
        >
            {/* Header */}
            <div className="header-row">
                <h3 className="header-title">
                    <GearIcon />
                    {title}
                </h3>
                <button
                    type="button"
                    className="close-btn"
                    onClick={onClose}
                    aria-label="Close dialog"
                >
                    ✕
                </button>
            </div>

            {/* Tab Navigation List */}
            {tabDescriptors.length > 0 && (
                <div
                    className="tab-bar"
                    role={ROLE_TABLIST}
                    aria-label="Settings categories"
                    onKeyDown={handleKeyDown}
                >
                    {tabDescriptors.map((tab) => {
                        const isSelected = tab.id === activeTab?.id;
                        const tabBtnClass = classNameMap({
                            "tab-btn": true,
                            "is-active": isSelected,
                        });

                        return (
                            <button
                                key={tab.id}
                                ref={(el) => {
                                    if (el) {
                                        tabRefs.current.set(tab.id, el);
                                    } else {
                                        tabRefs.current.delete(tab.id);
                                    }
                                }}
                                type="button"
                                role={ROLE_TAB}
                                id={`settings-tab-${tab.id}`}
                                aria-selected={isSelected}
                                aria-controls={`settings-panel-${tab.id}`}
                                tabIndex={isSelected ? 0 : -1}
                                disabled={tab.disabled}
                                className={tabBtnClass}
                                onClick={() => handleSelectTab(tab.id)}
                            >
                                {tab.icon && (
                                    <span className="tab-icon" aria-hidden="true">
                                        {tab.icon}
                                    </span>
                                )}
                                <span className="tab-label">{tab.label}</span>
                                {tab.badge !== undefined && (
                                    <span className="tab-badge">{tab.badge}</span>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Tab Panel */}
            {activeTab && (
                <div
                    role={ROLE_TABPANEL}
                    id={`settings-panel-${activeTab.id}`}
                    aria-labelledby={`settings-tab-${activeTab.id}`}
                    tabIndex={0}
                    className="tab-panel"
                >
                    {activeTab.content}
                </div>
            )}
        </Dialog>
    );
}
