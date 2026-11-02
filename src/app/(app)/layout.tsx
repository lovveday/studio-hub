import Link from "next/link";
import { LogOut, Plus, Search } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getActiveBrand } from "@/lib/brand-context";
import {
  listBrands,
  listNotifications,
  unreadNotificationCount,
} from "@/lib/data";
import { aiStatus } from "@/lib/ai";
import { NavLinks } from "@/components/nav";
import { BrandSwitcher } from "@/components/brand-switcher";
import { NotificationMenu } from "@/components/notification-menu";
import { Avatar } from "@/components/ui";
import { logoutAction } from "@/app/actions/auth";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const brand = await getActiveBrand();
  const brands = listBrands();
  const notifications = listNotifications(user.id, 8);
  const unread = unreadNotificationCount(user.id);
  const ai = aiStatus();

  return (
    <div className="min-h-dvh bg-paper lg:grid lg:grid-cols-[238px_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col bg-ink px-3 py-4 text-paper lg:flex">
        <Link href="/dashboard" className="flex items-center gap-2.5 px-2 pb-6">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-coral text-[13px] font-black text-white">
            S
          </span>
          <div>
            <p className="text-[11px] font-bold tracking-[0.18em]">STUDIO HUB</p>
            <p className="text-[9px] uppercase tracking-[0.16em] text-paper/35">Command center</p>
          </div>
        </Link>

        <Link
          href="/composer"
          className="mb-5 flex h-10 items-center justify-center gap-2 rounded-xl bg-coral text-xs font-bold text-white transition-colors hover:bg-[#e94b28]"
        >
          <Plus className="h-4 w-4" />
          New post
        </Link>

        <NavLinks />

        <div className="mt-auto space-y-3">
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
            <div className="flex items-center gap-1.5">
              <span
                className={`h-1.5 w-1.5 rounded-full ${ai.configured ? "bg-teal" : "bg-gold"}`}
              />
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-paper/60">
                {ai.label}
              </p>
            </div>
            <p className="mt-1.5 text-[10px] leading-relaxed text-paper/35">
              {ai.configured
                ? `Writing with ${ai.model}.`
                : "Add GEMINI_API_KEY to .env.local for real generation and transcription."}
            </p>
          </div>

          <div className="flex items-center gap-2.5 rounded-xl px-1.5 py-1">
            <Avatar name={user.name} color={user.avatar_color} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-semibold">{user.name}</p>
              <p className="truncate text-[9px] uppercase tracking-[0.1em] text-paper/35">{user.role}</p>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                title="Sign out"
                aria-label="Sign out"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-paper/40 transition-colors hover:bg-white/10 hover:text-white"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur-md">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <Link href="/dashboard" className="flex items-center gap-2 lg:hidden">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-[12px] font-black text-white">
                S
              </span>
            </Link>

            <div className="flex items-center gap-2">
              <BrandSwitcher
                brands={brands.map((item) => ({ id: item.id, name: item.name, color: item.color }))}
                activeId={brand.id}
                next="/dashboard"
              />
              <span className="hidden rounded-full bg-cream px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-muted sm:inline">
                {brand.timezone.replace("_", " ")}
              </span>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <Link
                href="/knowledge"
                className="hidden h-9 w-[210px] items-center gap-2 rounded-xl border border-line bg-white px-3 text-[11px] text-muted shadow-sm transition-colors hover:bg-cream/50 sm:flex"
              >
                <Search className="h-3.5 w-3.5" />
                Search the brand brain…
              </Link>
              <NotificationMenu notifications={notifications} unread={unread} />
              <Link href="/settings" className="rounded-full ring-2 ring-white">
                <Avatar name={user.name} color={user.avatar_color} />
              </Link>
            </div>
          </div>
          <div className="border-t border-line px-4 py-2 lg:hidden">
            <NavLinks mobile />
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
