/**
 * Contract for items that can be tracked in an IPriorityRegistry.
 */
export interface IPriorityItem {
    readonly priority: number;
}

/**
 * Registry interface for managing prioritized items with stable sorted array.
 */
export interface IPriorityRegistry<T extends IPriorityItem> {
    /** Total number of registered items */
    readonly size: number;

    /**
     * Registers an item in ascending priority order.
     * Returns true if registered, or false if already present.
     */
    register(item: T): boolean;

    /**
     * Unregisters an item by reference identity.
     * Returns true if the item was found and removed; false otherwise.
     */
    unregister(item: T): boolean;

    /**
     * Checks if an item exists in the registry.
     */
    has(item: T): boolean;

    /**
     * Returns a sorted readonly array of items ordered ascending by priority.
     */
    getSorted(): readonly T[];

    /**
     * Clears all registered items.
     */
    clear(): void;
}
