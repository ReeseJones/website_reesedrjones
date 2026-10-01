import { useDialog } from "./use_dialog";
import "./dialog.scss";

export interface DialogProps extends React.ComponentPropsWithoutRef<"dialog"> {
    /**
     * Determines whether the modal dialog is open or closed.
     */
    isOpen: boolean;

    /**
     * Callback invoked when the native dialog requests closure (e.g. Escape key).
     */
    onClose: () => void;

    /**
     * Content rendered inside the dialog-content container.
     */
    children?: React.ReactNode;
}

/**
 * Reusable modal dialog wrapper around native HTMLDialogElement.
 * Manages modal focus trapping and backdrop states, wrapping children in a stop-propagation content container.
 */
export function Dialog({
    isOpen,
    onClose,
    children,
    ...rest
}: DialogProps) {
    const [dialogRef] = useDialog(isOpen);

    return (
        <dialog {...rest} ref={dialogRef} onClose={onClose}>
            <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
                {children}
            </div>
        </dialog>
    );
}
