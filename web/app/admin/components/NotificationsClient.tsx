"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { CheckCheck, Loader2, Trash2 } from "lucide-react";

type AdminNotification = {
  id: number;
  type: string;
  title: string;
  message: string;
  actionUrl: string | null;
  entityType: string | null;
  entityId: number | null;
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

const PAGE_SIZE = 20;

export function NotificationsClient({
  emailRows,
}: {
  emailRows: EmailNotification[];
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        page: String(page),
      });
      if (q) params.set("q", q);
      const res = await fetch(`/api/admin/notifications?${params}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setItems(data.notifications ?? []);
      setUnreadCount(Number(data.unreadCount ?? 0));
      setTotal(Number(data.total ?? 0));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [page, q]);

  useEffect(() => {
    setLoading(true);
    const start = window.setTimeout(() => void load(), 0);
    const timer = window.setInterval(() => void load(), 45000);
    return () => {
      window.clearTimeout(start);
      window.clearInterval(timer);
    };
  }, [load]);

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

  async function remove(id: number) {
    await fetch(`/api/admin/notifications?id=${id}`, { method: "DELETE" });
    await load();
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div>
          <h1>Notifications</h1>
          <p className="page-sub">
            In-app admin alerts only (no email, SMS, or push from this center)
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

      <form
        className="admin-filters"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setQ(searchInput.trim());
        }}
      >
        <input
          className="admin-input"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search title, message, or type"
        />
        <button className="admin-btn" type="submit">
          Search
        </button>
      </form>

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
                  {new Date(item.createdAt).toLocaleString()} ·{" "}
                  {formatDistanceToNow(new Date(item.createdAt), {
                    addSuffix: true,
                  })}{" "}
                  · {item.type.replaceAll("_", " ")}
                </small>
              </div>
              <div className="admin-actions">
                {item.actionUrl ? (
                  <Link
                    className="admin-btn ghost"
                    href={item.actionUrl}
                    onClick={() => {
                      if (!item.isRead) void markRead(item.id);
                    }}
                  >
                    {item.entityType === "food_order"
                      ? "View food order"
                      : item.entityType === "booking"
                        ? "View booking"
                        : "Open"}
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
                <button
                  type="button"
                  className="admin-btn ghost"
                  onClick={() => void remove(item.id)}
                  aria-label="Delete notification"
                >
                  <Trash2 size={14} aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
        <div className="admin-pagination">
          <button
            type="button"
            className="admin-btn ghost"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <span className="admin-muted">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            className="admin-btn ghost"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      </section>

      <section className="admin-card">
        <div className="admin-card-head">
          <h2>Guest email delivery log</h2>
          <p className="page-sub">
            Separate from in-app admin alerts — guest booking emails only
          </p>
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
