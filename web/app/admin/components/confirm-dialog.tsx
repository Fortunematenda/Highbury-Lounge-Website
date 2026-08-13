"use client";

import * as AlertDialog from "@radix-ui/react-alert-dialog";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type ConfirmDialogOptions = {
  title?: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Destructive actions use the danger button style. Default: true when label looks destructive. */
  tone?: "danger" | "default";
};

type ConfirmState = ConfirmDialogOptions & {
  open: boolean;
};

type ConfirmFn = (options: string | ConfirmDialogOptions) => Promise<boolean>;

const ConfirmDialogContext = createContext<ConfirmFn | null>(null);

let externalConfirm: ConfirmFn | null = null;

function normalizeOptions(
  options: string | ConfirmDialogOptions,
): ConfirmDialogOptions {
  if (typeof options === "string") {
    return { description: options };
  }
  return options;
}

function resolveTone(
  options: ConfirmDialogOptions,
): "danger" | "default" {
  if (options.tone) return options.tone;
  const text = `${options.title ?? ""} ${options.description} ${options.confirmLabel ?? ""}`.toLowerCase();
  if (
    /\b(delete|remove|destroy|deactivate|permanent|cannot be undone)\b/.test(text)
  ) {
    return "danger";
  }
  return "default";
}

function resolveTitle(options: ConfirmDialogOptions): string {
  if (options.title) return options.title;
  const text = options.description.toLowerCase();
  if (text.includes("delete")) return "Delete permanently?";
  if (text.includes("remove")) return "Remove item?";
  if (text.includes("cancel")) return "Cancel item?";
  return "Please confirm";
}

function resolveConfirmLabel(
  options: ConfirmDialogOptions,
  tone: "danger" | "default",
): string {
  if (options.confirmLabel) return options.confirmLabel;
  const text = `${options.title ?? ""} ${options.description}`.toLowerCase();
  if (/\bremove\b/.test(text)) return "Remove";
  if (/\bcancel\b/.test(text)) return "Confirm cancel";
  if (/\bdeactivate\b/.test(text)) return "Deactivate";
  if (/\bdelete\b/.test(text)) return "Delete";
  return tone === "danger" ? "Delete" : "Confirm";
}

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmState>({
    open: false,
    description: "",
  });
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const close = useCallback((value: boolean) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setState((prev) => ({ ...prev, open: false }));
    resolve?.(value);
  }, []);

  const confirm = useCallback<ConfirmFn>((options) => {
    const normalized = normalizeOptions(options);
    return new Promise<boolean>((resolve) => {
      if (resolverRef.current) {
        resolverRef.current(false);
      }
      resolverRef.current = resolve;
      setState({ ...normalized, open: true });
    });
  }, []);

  externalConfirm = confirm;

  const value = useMemo(() => confirm, [confirm]);
  const tone = resolveTone(state);
  const title = resolveTitle(state);
  const confirmLabel = resolveConfirmLabel(state, tone);
  const cancelLabel = state.cancelLabel ?? "Cancel";

  return (
    <ConfirmDialogContext.Provider value={value}>
      {children}
      <AlertDialog.Root
        open={state.open}
        onOpenChange={(open) => {
          // Escape / overlay dismiss — only settle if still waiting
          if (!open && resolverRef.current) close(false);
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="admin-alert-overlay" />
          <AlertDialog.Content className="admin-alert-content" aria-describedby={undefined}>
            <AlertDialog.Title className="admin-alert-title">
              {title}
            </AlertDialog.Title>
            <AlertDialog.Description className="admin-alert-description">
              {state.description}
            </AlertDialog.Description>
            <div className="admin-alert-actions">
              <AlertDialog.Cancel asChild>
                <button
                  type="button"
                  className="admin-btn secondary"
                  onClick={() => close(false)}
                >
                  {cancelLabel}
                </button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <button
                  type="button"
                  className={`admin-btn${tone === "danger" ? " danger" : ""}`}
                  onClick={() => close(true)}
                >
                  {confirmLabel}
                </button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </ConfirmDialogContext.Provider>
  );
}

/** Promise-based confirm — drop-in replacement for `window.confirm`. */
export function confirmDialog(
  options: string | ConfirmDialogOptions,
): Promise<boolean> {
  if (externalConfirm) return externalConfirm(options);
  if (typeof window !== "undefined") {
    const normalized = normalizeOptions(options);
    return Promise.resolve(window.confirm(normalized.description));
  }
  return Promise.resolve(false);
}

export function useConfirmDialog(): ConfirmFn {
  const ctx = useContext(ConfirmDialogContext);
  if (!ctx) {
    return confirmDialog;
  }
  return ctx;
}
