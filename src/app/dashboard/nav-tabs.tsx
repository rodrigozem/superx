"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/dashboard", label: "Painel" },
  { href: "/dashboard/torneios", label: "Torneios" },
  { href: "/dashboard/users", label: "Usuários", adminOnly: true },
];

export function NavTabs({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {TABS.filter((tab) => !tab.adminOnly || isAdmin).map((tab) => {
        const active =
          tab.href === "/dashboard"
            ? pathname === tab.href
            : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "border-b-2 border-crimson-500 px-3 py-2 text-sm font-semibold text-white"
                : "border-b-2 border-transparent px-3 py-2 text-sm font-medium text-navy-300 transition hover:border-white/40 hover:text-white"
            }
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
