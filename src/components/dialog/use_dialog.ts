import { useEffect, useRef } from "react";

/**
 * Hook to manage native HTMLDialogElement modal lifecycle synchronized with an `isOpen` boolean state.
 * Controls showModal() and close() transitions with guard checks and unmount cleanup.
 */
export function useDialog(isOpen: boolean) {
    const dialogRef = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;

        if (isOpen) {
            // showModal() activates the backdrop and traps focus
            if (!dialog.open) {
                dialog.showModal();
            }
        } else {
            if (dialog.open) {
                dialog.close();
            }
        }

        return () => {
            if (dialog.open) {
                dialog.close();
            }
        };
    }, [isOpen]);

    return [dialogRef] as const;
}
