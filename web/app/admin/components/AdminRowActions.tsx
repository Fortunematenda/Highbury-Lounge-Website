"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

export type AdminRowAction = {
  label: string;
  onClick?: () => void;
  href?: string;
  danger?: boolean;
  disabled?: boolean;
};

export function AdminRowActions({
  actions,
  label = "Row actions",
}: {
  actions: AdminRowAction[];
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!actions.length) return null;

  return (
    <div className="admin-row-actions" data-row-actions ref={rootRef}>
      <button
        type="button"
        className="admin-kebab"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
      >
        <span />
        <span />
        <span />
      </button>
      {open ? (
        <div className="admin-kebab-menu" id={menuId} role="menu">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              role="menuitem"
              className={action.danger ? "danger" : undefined}
              disabled={action.disabled}
              onClick={(event) => {
                event.stopPropagation();
                setOpen(false);
                if (action.disabled) return;
                if (action.href) {
                  router.push(action.href);
                  return;
                }
                action.onClick?.();
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function AdminClickableRow({
  href,
  onOpen,
  children,
  className = "",
}: {
  href?: string;
  onOpen?: () => void;
  children: ReactNode;
  className?: string;
}) {
  const router = useRouter();
  const clickable = Boolean(href || onOpen);

  function activate(event: MouseEvent<HTMLTableRowElement>) {
    if (!clickable) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest("[data-row-actions], a, button, input, select, textarea, label")) {
      return;
    }
    if (onOpen) {
      onOpen();
      return;
    }
    if (href) router.push(href);
  }

  return (
    <tr
      className={`admin-row${clickable ? " is-clickable" : ""}${className ? ` ${className}` : ""}`}
      tabIndex={clickable ? 0 : undefined}
      onClick={activate}
      onKeyDown={(event) => {
        if (!clickable) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          activate(event as unknown as MouseEvent<HTMLTableRowElement>);
        }
      }}
    >
      {children}
    </tr>
  );
}
