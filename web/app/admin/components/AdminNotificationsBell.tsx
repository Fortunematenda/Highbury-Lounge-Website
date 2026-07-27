"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type AdminNotification = {
  id: number;
  type: string;
  title: string;
  message: string;
  actionUrl: string | null;
  isRead: boolean;
  createdAt: string;
};

export function AdminNotificationsBell() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  async function load() {
    try {
      setError("");
      const res = await fetch("/api/admin/notifications?limit=12", {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setItems(data.notifications ?? []);
      setUnreadCount(Number(data.unreadCount ?? 0));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const start = window.setTimeout(() => void load(), 0);
    const timer = window.setInterval(() => void load(), 45000);
    return () => {
      window.clearTimeout(start);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function markRead(id: number) {
    await fetch("/api/admin/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isRead: true }),
    });
    await load();
  }

  async function markAllRead() {
    await fetch("/api/admin/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    await load();
  }

  return (
    <div className="admin-bell" ref={rootRef}>
      <button
        type="button"
        className="admin-icon-btn"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          setOpen((v) => !v);
          if (!open) void load();
        }}
      >
        <Bell size={18} aria-hidden />
        {unreadCount > 0 ? (
          <span className="admin-bell-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
        ) : null}
      </button>

      {open ? (
        <div className="admin-bell-panel" id={panelId} role="dialog" aria-label="Notifications">
          <div className="admin-bell-head">
            <strong>Notifications</strong>
            <button
              type="button"
              className="admin-btn ghost"
              onClick={() => void markAllRead()}
              disabled={!unreadCount}
            >
              <CheckCheck size={14} aria-hidden /> Mark all read
            </button>
          </div>
          <div className="admin-bell-list">
            {loading ? (
              <p className="admin-search-state">
                <Loader2 size={16} className="spin" aria-hidden /> Loading…
              </p>
            ) : null}
            {error ? <p className="admin-search-state error">{error}</p> : null}
            {!loading && !error && items.length === 0 ? (
              <p className="admin-search-state">No notifications yet</p>
            ) : null}
            {items.map((item) => (
              <article
                key={item.id}
                className={`admin-bell-item${item.isRead ? "" : " is-unread"}`}
              >
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.message}</p>
                  <small>
                    {formatDistanceToNow(new Date(item.createdAt), {
                      addSuffix: true,
                    })}
                    {" · "}
                    {item.type.replaceAll("_", " ")}
                  </small>
                </div>
                <div className="admin-bell-item-actions">
                  {item.actionUrl ? (
                    <Link
                      href={item.actionUrl}
                      onClick={() => {
                        if (!item.isRead) void markRead(item.id);
                        setOpen(false);
                      }}
                    >
                      Open
                    </Link>
                  ) : null}
                  {!item.isRead ? (
                    <button type="button" onClick={() => void markRead(item.id)}>
                      Mark read
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
          <div className="admin-bell-foot">
            <Link href="/admin/notifications" onClick={() => setOpen(false)}>
              View all notifications
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
