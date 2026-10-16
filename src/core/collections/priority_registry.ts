import type { IPriorityItem, IPriorityRegistry } from "./priority_registry_types";

/**
 * Generic priority registry managing items by reference identity in an array
 * kept strictly sorted in ascending priority order via binary search insertion.
 */
export class PriorityRegistry<T extends IPriorityItem> implements IPriorityRegistry<T> {
    private readonly _items: T[] = [];

    public get size(): number {
        return this._items.length;
    }

    public register(item: T): boolean {
        if (this.has(item)) {
            return false;
        }

        const insertIndex = this._findInsertIndex(item.priority);
        this._items.splice(insertIndex, 0, item);
        return true;
    }

    public unregister(item: T): boolean {
        const index = this._items.indexOf(item);
        if (index === -1) {
            return false;
        }

        this._items.splice(index, 1);
        return true;
    }

    public has(item: T): boolean {
        return this._items.indexOf(item) !== -1;
    }

    public getSorted(): readonly T[] {
        return this._items;
    }

    public clear(): void {
        this._items.length = 0;
    }

    private _findInsertIndex(priority: number): number {
        let low = 0;
        let high = this._items.length;

        while (low < high) {
            const mid = (low + high) >>> 1;
            if (this._items[mid].priority <= priority) {
                low = mid + 1;
            } else {
                high = mid;
            }
        }

        return low;
    }
}
