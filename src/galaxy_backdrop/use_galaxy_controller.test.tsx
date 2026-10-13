import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGalaxyController } from "./use_galaxy_controller";
import { orbPreset } from "./parameters/presets/orb";
import { pinprickPreset } from "./parameters/presets/pinprick";

describe("useGalaxyController()", () => {
    const TEST_STORAGE_KEY = "test_galaxy_controller_key";

    beforeEach(() => {
        vi.useFakeTimers();
        window.localStorage.clear();
    });

    afterEach(() => {
        vi.runOnlyPendingTimers();
        vi.useRealTimers();
        window.localStorage.clear();
    });

    describe("initialization", () => {
        it("initializes with default parameters when storage is empty", () => {
            const { result } = renderHook(() =>
                useGalaxyController({ storageKey: TEST_STORAGE_KEY })
            );

            expect(result.current.params.starCount).toBe(orbPreset.params.starCount);
            expect(result.current.currentPresetId).toBe(orbPreset.id);
        });

        it("loads existing parameters from localStorage on initialization", () => {
            window.localStorage.setItem(
                TEST_STORAGE_KEY,
                JSON.stringify({ starCount: 150000, coreRadius: 3.2 })
            );

            const { result } = renderHook(() =>
                useGalaxyController({ storageKey: TEST_STORAGE_KEY })
            );

            expect(result.current.params.starCount).toBe(150000);
            expect(result.current.params.coreRadius).toBe(3.2);
            expect(result.current.currentPresetId).toBe("custom");
        });
    });

    describe("debounced localStorage persistence", () => {
        it("updates state synchronously but defers localStorage write by debounce timeout", () => {
            const setItemSpy = vi.spyOn(window.localStorage, "setItem");

            const { result } = renderHook(() =>
                useGalaxyController({
                    storageKey: TEST_STORAGE_KEY,
                    storageDebounceMs: 300,
                })
            );

            setItemSpy.mockClear();

            act(() => {
                result.current.updateParameters({ starCount: 250000 });
            });

            // State updates immediately in memory
            expect(result.current.params.starCount).toBe(250000);
            // localStorage not written yet
            expect(setItemSpy).not.toHaveBeenCalled();

            // Advance past debounce threshold
            act(() => {
                vi.advanceTimersByTime(300);
            });

            expect(setItemSpy).toHaveBeenCalledTimes(1);
            expect(setItemSpy).toHaveBeenCalledWith(
                TEST_STORAGE_KEY,
                expect.stringContaining('"starCount":250000')
            );
        });

        it("coalesces rapid consecutive parameter updates into a single write", () => {
            const setItemSpy = vi.spyOn(window.localStorage, "setItem");

            const { result } = renderHook(() =>
                useGalaxyController({
                    storageKey: TEST_STORAGE_KEY,
                    storageDebounceMs: 300,
                })
            );

            setItemSpy.mockClear();

            act(() => {
                result.current.updateParameters({ starCount: 100000 });
            });
            act(() => {
                vi.advanceTimersByTime(100);
                result.current.updateParameters({ starCount: 120000 });
            });
            act(() => {
                vi.advanceTimersByTime(100);
                result.current.updateParameters({ starCount: 140000 });
            });

            expect(setItemSpy).not.toHaveBeenCalled();

            act(() => {
                vi.advanceTimersByTime(300);
            });

            expect(setItemSpy).toHaveBeenCalledTimes(1);
            const savedData = JSON.parse(window.localStorage.getItem(TEST_STORAGE_KEY)!);
            expect(savedData.starCount).toBe(140000);
        });

        it("flushes pending debounced save when unmounted", () => {
            const setItemSpy = vi.spyOn(window.localStorage, "setItem");

            const { result, unmount } = renderHook(() =>
                useGalaxyController({
                    storageKey: TEST_STORAGE_KEY,
                    storageDebounceMs: 300,
                })
            );

            setItemSpy.mockClear();

            act(() => {
                result.current.updateParameters({ starCount: 222222 });
            });

            expect(setItemSpy).not.toHaveBeenCalled();

            unmount();

            expect(setItemSpy).toHaveBeenCalledTimes(1);
            const savedData = JSON.parse(window.localStorage.getItem(TEST_STORAGE_KEY)!);
            expect(savedData.starCount).toBe(222222);
        });
    });

    describe("resetParameters", () => {
        it("clears pending debounced save and removes key from localStorage", () => {
            const removeItemSpy = vi.spyOn(window.localStorage, "removeItem");
            const setItemSpy = vi.spyOn(window.localStorage, "setItem");

            const { result } = renderHook(() =>
                useGalaxyController({
                    storageKey: TEST_STORAGE_KEY,
                    storageDebounceMs: 300,
                })
            );

            act(() => {
                result.current.updateParameters({ starCount: 400000 });
            });

            setItemSpy.mockClear();

            act(() => {
                result.current.resetParameters();
            });

            expect(removeItemSpy).toHaveBeenCalledWith(TEST_STORAGE_KEY);

            // Fast-forward timers to make sure no debounced save leaked through
            act(() => {
                vi.advanceTimersByTime(500);
            });

            expect(setItemSpy).not.toHaveBeenCalled();
            expect(window.localStorage.getItem(TEST_STORAGE_KEY)).toBeNull();
            expect(result.current.params.starCount).toBe(orbPreset.params.starCount);
        });
    });

    describe("applyPreset", () => {
        it("applies preset parameters and triggers debounced persistence", () => {
            const { result } = renderHook(() =>
                useGalaxyController({
                    storageKey: TEST_STORAGE_KEY,
                    storageDebounceMs: 200,
                })
            );

            act(() => {
                result.current.applyPreset("pinprick");
            });

            expect(result.current.currentPresetId).toBe("pinprick");

            act(() => {
                vi.advanceTimersByTime(200);
            });

            const saved = JSON.parse(window.localStorage.getItem(TEST_STORAGE_KEY)!);
            expect(saved.style).toBe("pinprick");
        });
    });
});
