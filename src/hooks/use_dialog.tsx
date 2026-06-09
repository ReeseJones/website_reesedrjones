import { useEffect, useRef } from "react";

export function useDialog(isOpen: boolean) {

    const dialogRef = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;

        if (isOpen) {
            // showModal() activates the backdrop and traps focus
            dialog.showModal(); 
        } else {
            dialog.close();
        }
  }, [isOpen]);

  return [dialogRef] as const;

}