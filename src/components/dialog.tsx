import { useDialog } from "../hooks/use_dialog";
import "./dialog.scss";

export interface DialogProps extends React.ComponentPropsWithoutRef<'dialog'> {
    isOpen: boolean;
    onClose: () => void;
    children?: React.ReactNode;
}

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