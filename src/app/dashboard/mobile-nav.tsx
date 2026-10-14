"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { isNavTabActive, visibleNavTabs } from "./nav-tabs";

export function MobileNav({ isAdmin }: { isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", handleEscape);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const tabs = visibleNavTabs(isAdmin);

  return (
    <div className="sm:hidden">
      <button
        type="button"
        aria-label="Abrir menu de navegação"
        aria-expanded={open}
        aria-controls="mobile-nav"
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-navy-200 transition hover:bg-white/8 hover:text-white"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden
        >
          <path d="M4 6h16" />
          <path d="M4 12h16" />
          <path d="M4 18h16" />
        </svg>
      </button>

      {/* Offcanvas via portal: o header tem backdrop-blur (containing block),
          então `fixed` precisa ser renderizado fora dele. */}
      {open
        ? createPortal(
            <div className="sm:hidden">
              <div
                onClick={() => setOpen(false)}
                aria-hidden
                className="fixed inset-0 z-50 animate-[nav-overlay-in_0.2s_ease-out] bg-black/60 backdrop-blur-sm motion-reduce:animate-none"
              />

              <aside
                id="mobile-nav"
                role="dialog"
                aria-modal="true"
                aria-label="Menu de navegação"
                className="fixed right-0 top-0 z-50 flex h-full w-72 max-w-[82vw] animate-[nav-drawer-in_0.3s_ease-out] flex-col border-l border-white/10 bg-navy-950 shadow-2xl motion-reduce:animate-none"
              >
                <div className="flex h-14 items-center justify-between border-b border-white/8 px-4">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-navy-300">
                    Menu
                  </span>
                  <button
                    type="button"
                    aria-label="Fechar menu"
                    onClick={() => setOpen(false)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-navy-200 transition hover:bg-white/8 hover:text-white"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="M18 6 6 18" />
                      <path d="m6 6 12 12" />
                    </svg>
                  </button>
                </div>

                <nav aria-label="Navegação principal" className="flex flex-col gap-1 p-3">
                  {tabs.map((tab) => {
                    const active = isNavTabActive(pathname, tab.href);
                    return (
                      <Link
                        key={tab.href}
                        href={tab.href}
                        aria-current={active ? "page" : undefined}
                        onClick={() => setOpen(false)}
                        className={
                          active
                            ? "rounded-lg border-l-2 border-crimson-500 bg-white/8 px-4 py-3 text-sm font-semibold text-white"
                            : "rounded-lg border-l-2 border-transparent px-4 py-3 text-sm font-medium text-navy-200 transition hover:bg-white/5 hover:text-white"
                        }
                      >
                        {tab.label}
                      </Link>
                    );
                  })}
                </nav>
              </aside>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
