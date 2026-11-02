import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import type { NotificationRow } from "@/lib/types";
import { relativeTime } from "@/lib/utils";
import { markAllNotificationsReadAction } from "@/app/actions/inbox";

export function NotificationMenu({
  notifications,
  unread,
}: {
  notifications: NotificationRow[];
  unread: number;
}) {
  return (
    <details className="group relative">
      <summary className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-xl border border-line bg-white text-ink/70 shadow-sm transition-colors hover:bg-cream/60 [&::-webkit-details-marker]:hidden">
        <Bell className="h-4 w-4" />
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-coral px-1 text-[9px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </summary>
      <div className="absolute right-0 z-40 mt-2 w-[340px] overflow-hidden rounded-2xl border border-line bg-white shadow-[0_24px_60px_-24px_rgba(17,19,24,0.45)]">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink/70">Notifications</p>
          {unread > 0 ? (
            <form action={markAllNotificationsReadAction}>
              <input type="hidden" name="next" value="/dashboard" />
              <button
                type="submit"
                className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted hover:text-ink"
              >
                <CheckCheck className="h-3 w-3" />
                Mark read
              </button>
            </form>
          ) : null}
        </div>
        <div className="max-h-[360px] overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="px-4 py-8 text-center text-xs text-muted">Nothing waiting. Good place to be.</p>
          ) : (
            notifications.map((notification) => (
              <Link
                key={notification.id}
                href={notification.link ?? "/dashboard"}
                className="block border-b border-line/70 px-4 py-3 transition-colors last:border-0 hover:bg-cream/40"
              >
                <div className="flex items-start gap-2">
                  <span
                    className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                      notification.read_at ? "bg-line" : "bg-coral"
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold leading-snug text-ink">{notification.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-muted">
                      {notification.body}
                    </p>
                    <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.08em] text-muted/70">
                      {relativeTime(notification.created_at)}
                    </p>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </details>
  );
}
