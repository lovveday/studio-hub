"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  FileBarChart,
  FlaskConical,
  LayoutDashboard,
  Library,
  MessageCircle,
  PenLine,
  Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Command center", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/composer", label: "Composer", icon: PenLine },
  { href: "/virality", label: "Virality Lab", icon: FlaskConical },
  { href: "/knowledge", label: "Knowledge", icon: Library },
  { href: "/inbox", label: "Inbox", icon: MessageCircle },
  { href: "/reports", label: "Reports", icon: FileBarChart },
  { href: "/settings", label: "Settings", icon: Settings2 },
];

export function NavLinks({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const activeHref = items.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  )?.href;

  useEffect(() => {
    if (!mobile || !navRef.current || !activeHref) return;
    const nav = navRef.current;
    const active = nav.querySelector<HTMLElement>(`a[href="${activeHref}"]`);
    if (!active) return;
    const navBox = nav.getBoundingClientRect();
    const activeBox = active.getBoundingClientRect();
    const target =
      nav.scrollLeft +
      (activeBox.left - navBox.left) -
      Math.max(0, (nav.clientWidth - activeBox.width) / 2);
    nav.scrollTo({ left: target, behavior: "smooth" });
  }, [activeHref, mobile]);

  return (
    <nav
      ref={navRef}
      className={cn(
        mobile ? "flex items-center gap-1 overflow-x-auto hide-scrollbar" : "flex flex-col gap-1"
      )}
      aria-label="Primary"
    >
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex items-center gap-2.5 rounded-xl text-[13px] font-medium transition-colors",
              mobile ? "shrink-0 px-3 py-2" : "px-3 py-2.5",
              active
                ? mobile
                  ? "bg-ink text-paper"
                  : "bg-white/10 text-white"
                : mobile
                  ? "text-ink/60 hover:bg-cream/70 hover:text-ink"
                  : "text-white/55 hover:bg-white/[0.06] hover:text-white"
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4 shrink-0 transition-colors",
                active
                  ? "text-coral"
                  : mobile
                    ? "text-ink/35 group-hover:text-ink/70"
                    : "text-white/40 group-hover:text-white/70"
              )}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
