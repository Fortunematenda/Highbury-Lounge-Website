"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { CheckCheck, Loader2 } from "lucide-react";

type AdminNotification = {
  id: number;
  type: string;
  title: string;
  message: string;
  actionUrl: string | null;
  isRead: boolean;
  createdAt: string;
};

type EmailNotification = {
  id: number;
  templateKey: string;
  recipientEmail: string;
  subject: string;
  status: string;
  createdAt: string;
};

export function NotificationsClient({
  emailRows,
}: {
  emailRows: EmailNotification[];
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  async function load() {
    try {
      setError("");
      const res = await fetch("/api/admin/notifications?limit=100", {
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
    return () => window.clearTimeout(start);
  }, []);

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
    <div className="admin-page">
      <header className="admin-page-header">
        <div>
          <h1>Notifications</h1>
          <p className="page-sub">
            In-app alerts for bookings, payments, and enquiries
            {unreadCount ? ` · ${unreadCount} unread` : ""}
          </p>
        </div>
        <button
          type="button"
          className="admin-btn secondary"
          onClick={() => void markAllRead()}
          disabled={!unreadCount}
        >
          <CheckCheck size={16} aria-hidden /> Mark all as read
        </button>
      </header>

      <section className="admin-card">
        <div className="admin-card-head">
          <h2>Admin alerts</h2>
        </div>
        {loading ? (
          <p className="admin-search-state">
            <Loader2 size={16} className="spin" aria-hidden /> Loading…
          </p>
        ) : null}
        {error ? <p className="admin-search-state error">{error}</p> : null}
        {!loading && !error && items.length === 0 ? (
          <p className="admin-empty">No admin notifications yet.</p>
        ) : null}
        <ul className="admin-notif-list">
          {items.map((item) => (
            <li key={item.id} className={item.isRead ? undefined : "is-unread"}>
              <div>
                <strong>{item.title}</strong>
                <p>{item.message}</p>
                <small>
                  {formatDistanceToNow(new Date(item.createdAt), {
                    addSuffix: true,
                  })}{" "}
                  · {item.type.replaceAll("_", " ")}
                </small>
              </div>
              <div className="admin-actions">
                {item.actionUrl ? (
                  <Link className="admin-btn ghost" href={item.actionUrl}>
                    Open
                  </Link>
                ) : null}
                {!item.isRead ? (
                  <button
                    type="button"
                    className="admin-btn secondary"
                    onClick={() => void markRead(item.id)}
                  >
                    Mark read
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="admin-card">
        <div className="admin-card-head">
          <h2>Email delivery log</h2>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Template</th>
                <th>Recipient</th>
                <th>Subject</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {emailRows.length === 0 ? (
                <tr>
                  <td colSpan={5}>No email notifications logged.</td>
                </tr>
              ) : null}
              {emailRows.map((n) => (
                <tr key={n.id}>
                  <td>{n.templateKey}</td>
                  <td>{n.recipientEmail}</td>
                  <td>{n.subject}</td>
                  <td>{n.status}</td>
                  <td>{n.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
