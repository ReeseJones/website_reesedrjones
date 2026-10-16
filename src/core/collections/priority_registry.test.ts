import { describe, it, expect, beforeEach } from "vitest";
import { PriorityRegistry } from "./priority_registry";
import type { IPriorityItem } from "./priority_registry_types";

interface TestItem extends IPriorityItem {
    readonly label?: string;
}

describe("PriorityRegistry", () => {
    let registry: PriorityRegistry<TestItem>;

    beforeEach(() => {
        registry = new PriorityRegistry<TestItem>();
    });

    describe(".size", () => {
        it("should return 0 for an empty registry", () => {
            expect(registry.size).toBe(0);
        });

        it("should reflect the number of registered items", () => {
            const item1: TestItem = { priority: 10, label: "Item 1" };
            const item2: TestItem = { priority: 20, label: "Item 2" };

            registry.register(item1);
            expect(registry.size).toBe(1);

            registry.register(item2);
            expect(registry.size).toBe(2);
        });

        it("should decrement when an item is unregistered", () => {
            const item1: TestItem = { priority: 10, label: "Item 1" };
            const item2: TestItem = { priority: 20, label: "Item 2" };

            registry.register(item1);
            registry.register(item2);
            expect(registry.size).toBe(2);

            registry.unregister(item1);
            expect(registry.size).toBe(1);

            registry.unregister(item2);
            expect(registry.size).toBe(0);
        });
    });

    describe(".register()", () => {
        it("should return true and increment size when registering a new item", () => {
            const item: TestItem = { priority: 5, label: "Alpha" };
            const registered = registry.register(item);

            expect(registered).toBe(true);
            expect(registry.size).toBe(1);
        });

        it("should return false and not increment size or duplicate when registering the exact same reference", () => {
            const item: TestItem = { priority: 5, label: "Duplicate" };
            const firstResult = registry.register(item);
            const secondResult = registry.register(item);

            expect(firstResult).toBe(true);
            expect(secondResult).toBe(false);
            expect(registry.size).toBe(1);
            expect(registry.getSorted()).toEqual([item]);
        });

        it("should allow registering two distinct object instances with identical priorities and labels", () => {
            const itemA: TestItem = { priority: 1, label: "Same" };
            const itemB: TestItem = { priority: 1, label: "Same" };

            expect(registry.register(itemA)).toBe(true);
            expect(registry.register(itemB)).toBe(true);
            expect(registry.size).toBe(2);
        });

        it("should insert items in ascending priority order across negative, zero, and positive priorities", () => {
            const posHigh: TestItem = { priority: 100, label: "PosHigh" };
            const posLow: TestItem = { priority: 5, label: "PosLow" };
            const zero: TestItem = { priority: 0, label: "Zero" };
            const negLow: TestItem = { priority: -1, label: "NegLow" };
            const negHigh: TestItem = { priority: -50, label: "NegHigh" };

            // Register in arbitrary out-of-order sequence
            registry.register(posHigh);
            registry.register(negLow);
            registry.register(zero);
            registry.register(posLow);
            registry.register(negHigh);

            expect(registry.getSorted()).toEqual([negHigh, negLow, zero, posLow, posHigh]);
        });

        it("should maintain stable insertion order for items with identical priorities", () => {
            const first: TestItem = { priority: 10, label: "First" };
            const second: TestItem = { priority: 10, label: "Second" };
            const third: TestItem = { priority: 10, label: "Third" };

            registry.register(first);
            registry.register(second);
            registry.register(third);

            const sorted = registry.getSorted();
            expect(sorted).toEqual([first, second, third]);
            expect(sorted[0]).toBe(first);
            expect(sorted[1]).toBe(second);
            expect(sorted[2]).toBe(third);
        });
    });

    describe(".unregister()", () => {
        it("should return true and remove the item when unregistering an existing item", () => {
            const item: TestItem = { priority: 10, label: "To Remove" };
            registry.register(item);
            expect(registry.size).toBe(1);

            const removed = registry.unregister(item);

            expect(removed).toBe(true);
            expect(registry.size).toBe(0);
            expect(registry.has(item)).toBe(false);
        });

        it("should return false and leave size unchanged when unregistering a non-existent item", () => {
            const itemIn: TestItem = { priority: 10, label: "Present" };
            const itemOut: TestItem = { priority: 10, label: "Not Present" };

            registry.register(itemIn);
            expect(registry.size).toBe(1);

            const removed = registry.unregister(itemOut);

            expect(removed).toBe(false);
            expect(registry.size).toBe(1);
        });

        it("should return false when unregistering an item that was already unregistered", () => {
            const item: TestItem = { priority: 5, label: "Once" };
            registry.register(item);

            expect(registry.unregister(item)).toBe(true);
            expect(registry.unregister(item)).toBe(false);
            expect(registry.size).toBe(0);
        });
    });

    describe(".has()", () => {
        it("should return false before an item is registered", () => {
            const item: TestItem = { priority: 0, label: "Unregistered" };
            expect(registry.has(item)).toBe(false);
        });

        it("should return true after an item is registered", () => {
            const item: TestItem = { priority: 0, label: "Registered" };
            registry.register(item);

            expect(registry.has(item)).toBe(true);
        });

        it("should return false after an item is unregistered", () => {
            const item: TestItem = { priority: 0, label: "Temp" };
            registry.register(item);
            expect(registry.has(item)).toBe(true);

            registry.unregister(item);
            expect(registry.has(item)).toBe(false);
        });

        it("should distinguish different object references with identical fields", () => {
            const itemA: TestItem = { priority: 0, label: "Clone" };
            const itemB: TestItem = { priority: 0, label: "Clone" };

            registry.register(itemA);

            expect(registry.has(itemA)).toBe(true);
            expect(registry.has(itemB)).toBe(false);
        });
    });

    describe(".getSorted()", () => {
        it("should return an empty array for an empty registry", () => {
            const sorted = registry.getSorted();
            expect(sorted).toEqual([]);
            expect(sorted).toHaveLength(0);
        });

        it("should return the exact same array reference across multiple calls", () => {
            const item1: TestItem = { priority: 10, label: "A" };
            const item2: TestItem = { priority: 20, label: "B" };
            registry.register(item1);
            registry.register(item2);

            const firstCall = registry.getSorted();
            const secondCall = registry.getSorted();

            expect(firstCall).toBe(secondCall);
        });

        it("should sort items ascending by priority across negative, zero, and positive priorities", () => {
            const low: TestItem = { priority: -10, label: "Low" };
            const zero: TestItem = { priority: 0, label: "Zero" };
            const mid: TestItem = { priority: 5, label: "Mid" };
            const high: TestItem = { priority: 100, label: "High" };

            registry.register(high);
            registry.register(zero);
            registry.register(low);
            registry.register(mid);

            const sorted = registry.getSorted();
            expect(sorted).toEqual([low, zero, mid, high]);
        });

        it("should maintain the exact same array reference when mutating via register", () => {
            const arrayRef = registry.getSorted();

            const item: TestItem = { priority: 1, label: "Item" };
            registry.register(item);

            expect(registry.getSorted()).toBe(arrayRef);
            expect(arrayRef).toHaveLength(1);
            expect(arrayRef[0]).toBe(item);
        });

        it("should maintain the exact same array reference when mutating via unregister", () => {
            const item1: TestItem = { priority: 1, label: "Item 1" };
            const item2: TestItem = { priority: 2, label: "Item 2" };
            registry.register(item1);
            registry.register(item2);

            const arrayRef = registry.getSorted();
            registry.unregister(item1);

            expect(registry.getSorted()).toBe(arrayRef);
            expect(arrayRef).toHaveLength(1);
            expect(arrayRef[0]).toBe(item2);
        });

        it("should maintain the exact same array reference when mutating via clear", () => {
            const item: TestItem = { priority: 1, label: "Item" };
            registry.register(item);

            const arrayRef = registry.getSorted();
            registry.clear();

            expect(registry.getSorted()).toBe(arrayRef);
            expect(arrayRef).toHaveLength(0);
        });
    });

    describe(".clear()", () => {
        it("should remove all items and reset size to 0", () => {
            const item1: TestItem = { priority: 1, label: "Item 1" };
            const item2: TestItem = { priority: 2, label: "Item 2" };
            registry.register(item1);
            registry.register(item2);
            expect(registry.size).toBe(2);

            registry.clear();

            expect(registry.size).toBe(0);
            expect(registry.has(item1)).toBe(false);
            expect(registry.has(item2)).toBe(false);
            expect(registry.getSorted()).toHaveLength(0);
        });

        it("should be idempotent when called on an already empty registry", () => {
            expect(registry.size).toBe(0);
            expect(() => registry.clear()).not.toThrow();
            expect(registry.size).toBe(0);
            expect(registry.getSorted()).toHaveLength(0);
        });
    });
});
