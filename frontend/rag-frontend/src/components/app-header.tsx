"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type AppHeaderProps = {
  chatHref?: string | null;
};

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Add Source", href: "/add-source" },
];

export default function AppHeader({ chatHref }: AppHeaderProps) {
  const pathname = usePathname();
  const chatItem = {
    label: "Chat",
    href: chatHref ?? "/dashboard",
    disabled: !chatHref,
  };

  const items = [...NAV_ITEMS, chatItem];

  return (
    <header className="sticky top-0 z-20 border-b border-slate-800/80 bg-slate-950/92 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
        <Link href="/dashboard" className="text-lg font-semibold tracking-tight text-slate-100">
          AI<span className="text-sky-400">Knowledge</span>
        </Link>

        <nav className="flex flex-wrap gap-2">
          {items.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : item.href === "/add-source"
                  ? pathname === "/add-source"
                  : pathname.startsWith("/chat/");

            if ("disabled" in item && item.disabled) {
              return (
                <span
                  key={item.label}
                  className="rounded-full border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-500"
                >
                  {item.label}
                </span>
              );
            }

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? "border-sky-400/60 bg-sky-500/15 text-sky-200"
                    : "border-slate-700 bg-slate-900 text-slate-200 hover:border-sky-400 hover:text-sky-300"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
