"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavTab = { href: string; label: string; adminOnly?: boolean };

export const NAV_TABS: NavTab[] = [
  { href: "/dashboard", label: "Painel" },
  { href: "/dashboard/torneios", label: "Torneios" },
  { href: "/dashboard/users", label: "Usuários", adminOnly: true },
];

export function isNavTabActive(pathname: string, href: string): boolean {
  return href === "/dashboard" ? pathname === href : pathname.startsWith(href);
}

export function visibleNavTabs(isAdmin: boolean): NavTab[] {
  return NAV_TABS.filter((tab) => !tab.adminOnly || isAdmin);
}

export function NavTabs({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação principal"
      className="flex w-full items-stretch gap-0.5 self-stretch sm:w-auto"
    >
      {visibleNavTabs(isAdmin).map((tab) => {
        const active = isNavTabActive(pathname, tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "relative flex items-center whitespace-nowrap px-3.5 text-[13px] font-semibold uppercase tracking-[0.05em] text-white after:absolute after:bottom-0 after:left-3.5 after:right-3.5 after:h-0.5 after:rounded-full after:bg-crimson-500"
                : "relative flex items-center whitespace-nowrap px-3.5 text-[13px] font-medium uppercase tracking-[0.05em] text-navy-300 transition hover:text-white"
            }
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
