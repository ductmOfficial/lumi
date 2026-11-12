import { Button, Dialog, DialogActions, DialogTrigger } from "@ductmofficial/sen-ui";
import type { ReactNode } from "react";

import { useT } from "@/i18n/useT";

/**
 * A button that asks before a destructive action, in an alertdialog that keeps focus inside
 * and returns it to the button when it closes.
 */
export function ConfirmButton({
  children,
  className,
  disabled,
  title,
  message,
  confirmLabel,
  onConfirm,
}: {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
}) {
  const t = useT();
  return (
    <DialogTrigger>
      <Button variant="secondary" disabled={disabled} className={className}>
        {children}
      </Button>
      <Dialog title={title} role="alertdialog">
        {({ close }) => (
          <>
            <p className="text-sm text-muted">{message}</p>
            <DialogActions>
              <Button variant="secondary" onClick={close}>
                {t("common.cancel")}
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  close();
                  onConfirm();
                }}
                className="border-danger bg-danger text-white hover:bg-danger/90 dark:text-bg"
              >
                {confirmLabel}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </DialogTrigger>
  );
}
