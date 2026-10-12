import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
    mergeSiteSettings,
    loadSiteSettings,
    saveSiteSettings,
    removeStoredSiteSettings,
    useSiteSettings,
} from "./use_site_settings";
import {
    DEFAULT_SITE_SETTINGS,
    STORAGE_KEY_SITE_SETTINGS,
    type SiteSettings,
} from "./site_settings_types";

describe("use_site_settings", () => {
    beforeEach(() => {
        window.localStorage.clear();
        vi.restoreAllMocks();
    });

    describe("mergeSiteSettings()", () => {
        it("returns original base object reference when patch is undefined", () => {
            const base: SiteSettings = {
                debug: { showFps: false },
            };
            const result = mergeSiteSettings(base, undefined);
            expect(result).toBe(base);
            expect(result).toEqual({ debug: { showFps: false } });
        });

        it("returns original base object reference when patch is null", () => {
            const base: SiteSettings = {
                debug: { showFps: true },
            };
            const result = mergeSiteSettings(base, null);
            expect(result).toBe(base);
            expect(result).toEqual({ debug: { showFps: true } });
        });

        it("merges partial debug patch immutably without modifying the base object", () => {
            const base: SiteSettings = {
                debug: { showFps: false },
            };
            const patch = {
                debug: { showFps: true },
            };

            const result = mergeSiteSettings(base, patch);

            expect(result).not.toBe(base);
            expect(base.debug.showFps).toBe(false);
            expect(result.debug.showFps).toBe(true);
        });

        it("preserves base debug values when patch has an empty debug object", () => {
            const base: SiteSettings = {
                debug: { showFps: true },
            };
            const patch = {
                debug: {},
            };

            const result = mergeSiteSettings(base, patch);
            expect(result.debug.showFps).toBe(true);
        });

        it("preserves base debug values when patch contains no debug property", () => {
            const base: SiteSettings = {
                debug: { showFps: true },
            };
            const patch = {};

            const result = mergeSiteSettings(base, patch);
            expect(result.debug.showFps).toBe(true);
        });
    });

    describe("loadSiteSettings()", () => {
        it("returns DEFAULT_SITE_SETTINGS when storageKey is null or undefined", () => {
            expect(loadSiteSettings(null)).toEqual(DEFAULT_SITE_SETTINGS);
            expect(loadSiteSettings(undefined)).toEqual(DEFAULT_SITE_SETTINGS);
        });

        it("returns DEFAULT_SITE_SETTINGS when storage has no entry for storageKey", () => {
            const result = loadSiteSettings(STORAGE_KEY_SITE_SETTINGS);
            expect(result).toEqual(DEFAULT_SITE_SETTINGS);
        });

        it("merges initialSettings when provided and storage is empty", () => {
            const result = loadSiteSettings(STORAGE_KEY_SITE_SETTINGS, {
                debug: { showFps: true },
            });
            expect(result.debug.showFps).toBe(true);
        });

        it("loads and deserializes stored settings from localStorage", () => {
            const stored: SiteSettings = {
                debug: { showFps: true },
            };
            window.localStorage.setItem(
                STORAGE_KEY_SITE_SETTINGS,
                JSON.stringify(stored)
            );

            const result = loadSiteSettings(STORAGE_KEY_SITE_SETTINGS);
            expect(result.debug.showFps).toBe(true);
        });

        it("prioritizes stored settings over initialSettings overrides", () => {
            const stored: SiteSettings = {
                debug: { showFps: false },
            };
            window.localStorage.setItem(
                STORAGE_KEY_SITE_SETTINGS,
                JSON.stringify(stored)
            );

            const result = loadSiteSettings(STORAGE_KEY_SITE_SETTINGS, {
                debug: { showFps: true },
            });
            expect(result.debug.showFps).toBe(false);
        });

        it("handles corrupted or malformed JSON in localStorage gracefully", () => {
            window.localStorage.setItem(
                STORAGE_KEY_SITE_SETTINGS,
                "invalid-json{{"
            );

            const result = loadSiteSettings(STORAGE_KEY_SITE_SETTINGS);
            expect(result).toEqual(DEFAULT_SITE_SETTINGS);
        });

        it("handles non-object parsed JSON from localStorage gracefully", () => {
            window.localStorage.setItem(
                STORAGE_KEY_SITE_SETTINGS,
                JSON.stringify("a primitive string")
            );

            const result = loadSiteSettings(STORAGE_KEY_SITE_SETTINGS);
            expect(result).toEqual(DEFAULT_SITE_SETTINGS);
        });

        it("returns fallback defaults when localStorage.getItem throws a SecurityError/exception", () => {
            vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
                throw new Error("SecurityError: Access is denied");
            });

            const result = loadSiteSettings(STORAGE_KEY_SITE_SETTINGS);
            expect(result).toEqual(DEFAULT_SITE_SETTINGS);
        });
    });

    describe("saveSiteSettings()", () => {
        it("persists serialized settings to localStorage under specified key", () => {
            const settings: SiteSettings = {
                debug: { showFps: true },
            };
            saveSiteSettings("custom_settings_key", settings);

            const stored = window.localStorage.getItem("custom_settings_key");
            expect(stored).not.toBeNull();
            expect(JSON.parse(stored!)).toEqual(settings);
        });

        it("does nothing when storageKey is null or undefined", () => {
            const setItemSpy = vi.spyOn(Storage.prototype, "setItem");
            saveSiteSettings(null, DEFAULT_SITE_SETTINGS);
            saveSiteSettings(undefined, DEFAULT_SITE_SETTINGS);

            expect(setItemSpy).not.toHaveBeenCalled();
        });

        it("gracefully catches quota or access exceptions thrown by localStorage.setItem", () => {
            vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
                throw new Error("QuotaExceededError: storage limit reached");
            });

            expect(() => {
                saveSiteSettings(STORAGE_KEY_SITE_SETTINGS, DEFAULT_SITE_SETTINGS);
            }).not.toThrow();
        });
    });

    describe("removeStoredSiteSettings()", () => {
        it("removes persisted entry from localStorage", () => {
            window.localStorage.setItem("test_key", JSON.stringify({ ok: true }));
            expect(window.localStorage.getItem("test_key")).not.toBeNull();

            removeStoredSiteSettings("test_key");
            expect(window.localStorage.getItem("test_key")).toBeNull();
        });

        it("does nothing when storageKey is null or undefined", () => {
            const removeItemSpy = vi.spyOn(Storage.prototype, "removeItem");
            removeStoredSiteSettings(null);
            removeStoredSiteSettings(undefined);

            expect(removeItemSpy).not.toHaveBeenCalled();
        });

        it("gracefully catches exceptions thrown by localStorage.removeItem", () => {
            vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
                throw new Error("Storage access error");
            });

            expect(() => {
                removeStoredSiteSettings("test_key");
            }).not.toThrow();
        });
    });

    describe("useSiteSettings()", () => {
        it("initializes with DEFAULT_SITE_SETTINGS when localStorage is empty", () => {
            const { result } = renderHook(() => useSiteSettings());

            expect(result.current.settings).toEqual(DEFAULT_SITE_SETTINGS);
            expect(result.current.settings.debug.showFps).toBe(false);
            expect(typeof result.current.updateSettings).toBe("function");
            expect(typeof result.current.resetSettings).toBe("function");
        });

        it("initializes with stored settings when present in localStorage", () => {
            const stored: SiteSettings = {
                debug: { showFps: true },
            };
            window.localStorage.setItem(
                STORAGE_KEY_SITE_SETTINGS,
                JSON.stringify(stored)
            );

            const { result } = renderHook(() => useSiteSettings());
            expect(result.current.settings.debug.showFps).toBe(true);
        });

        it("respects custom storageKey and initialSettings options", () => {
            const customKey = "custom_prefs_v1";
            const { result } = renderHook(() =>
                useSiteSettings({
                    storageKey: customKey,
                    initialSettings: { debug: { showFps: true } },
                })
            );

            expect(result.current.settings.debug.showFps).toBe(true);
        });

        it("updates settings immutably and synchronizes to localStorage upon updateSettings()", () => {
            const { result } = renderHook(() => useSiteSettings());

            expect(result.current.settings.debug.showFps).toBe(false);

            act(() => {
                result.current.updateSettings({
                    debug: { showFps: true },
                });
            });

            expect(result.current.settings.debug.showFps).toBe(true);

            const storedRaw = window.localStorage.getItem(STORAGE_KEY_SITE_SETTINGS);
            expect(storedRaw).not.toBeNull();
            const storedParsed = JSON.parse(storedRaw!) as SiteSettings;
            expect(storedParsed.debug.showFps).toBe(true);
        });

        it("resets settings to defaults and clears storage upon resetSettings()", () => {
            const { result } = renderHook(() => useSiteSettings());

            act(() => {
                result.current.updateSettings({
                    debug: { showFps: true },
                });
            });
            expect(result.current.settings.debug.showFps).toBe(true);
            expect(window.localStorage.getItem(STORAGE_KEY_SITE_SETTINGS)).not.toBeNull();

            act(() => {
                result.current.resetSettings();
            });

            expect(result.current.settings).toEqual(DEFAULT_SITE_SETTINGS);
            expect(result.current.settings.debug.showFps).toBe(false);
            expect(window.localStorage.getItem(STORAGE_KEY_SITE_SETTINGS)).toBeNull();
        });

        it("maintains stable callback references across re-renders when storageKey does not change", () => {
            const { result, rerender } = renderHook(() => useSiteSettings());

            const initialUpdate = result.current.updateSettings;
            const initialReset = result.current.resetSettings;

            rerender();

            expect(result.current.updateSettings).toBe(initialUpdate);
            expect(result.current.resetSettings).toBe(initialReset);
        });

        it("handles storage exceptions gracefully during updateSettings()", () => {
            const { result } = renderHook(() => useSiteSettings());

            vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
                throw new Error("QuotaExceededError");
            });

            expect(() => {
                act(() => {
                    result.current.updateSettings({
                        debug: { showFps: true },
                    });
                });
            }).not.toThrow();

            expect(result.current.settings.debug.showFps).toBe(true);
        });
    });
});
