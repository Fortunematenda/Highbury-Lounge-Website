"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

export type AdminRowAction = {
  label: string;
  onClick?: () => void;
  href?: string;
  danger?: boolean;
  disabled?: boolean;
};

type MenuPos = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

function computeMenuPos(anchor: HTMLElement): MenuPos {
  const rect = anchor.getBoundingClientRect();
  const menuWidth = Math.min(220, window.innerWidth - 24);
  const spaceBelow = window.innerHeight - rect.bottom - 12;
  const spaceAbove = rect.top - 12;
  const preferBelow = spaceBelow >= 160 || spaceBelow >= spaceAbove;
  const maxHeight = Math.max(120, Math.min(320, preferBelow ? spaceBelow : spaceAbove));
  const top = preferBelow
    ? rect.bottom + 6
    : Math.max(12, rect.top - maxHeight - 6);
  let left = rect.right - menuWidth;
  left = Math.max(12, Math.min(left, window.innerWidth - menuWidth - 12));
  return { top, left, width: menuWidth, maxHeight };
}

export function AdminRowActions({
  actions,
  label = "Row actions",
}: {
  actions: AdminRowAction[];
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<MenuPos | null>(null);
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const router = useRouter();

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const update = () => {
      if (!buttonRef.current) return;
      setPos(computeMenuPos(buttonRef.current));
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
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

  const menu =
    open && mounted && pos
      ? createPortal(
          <div
            ref={menuRef}
            className="admin-kebab-menu"
            id={menuId}
            role="menu"
            style={{
              top: pos.top,
              left: pos.left,
              width: pos.width,
              maxHeight: pos.maxHeight,
            }}
          >
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
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="admin-row-actions" data-row-actions ref={rootRef}>
      <button
        ref={buttonRef}
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
      {menu}
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
