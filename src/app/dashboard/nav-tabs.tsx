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
    <nav aria-label="Navegação principal" className="flex items-center gap-0.5 self-stretch">
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
                ? "relative flex items-center px-3.5 text-[13px] font-semibold uppercase tracking-[0.05em] text-white after:absolute after:bottom-0 after:left-3.5 after:right-3.5 after:h-0.5 after:rounded-full after:bg-crimson-500"
                : "relative flex items-center px-3.5 text-[13px] font-medium uppercase tracking-[0.05em] text-navy-300 transition hover:text-white"
            }
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
