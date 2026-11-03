"use client";

import { useEffect, useRef, useState } from "react";

import { BackupControls } from "@/modules/super12/ui/backup-controls";

function ChevronDown({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

type ConfigMenuProps = {
  variant: "desktop" | "mobile";
};

/**
 * Item "Config" da navegação principal. No desktop abre um dropdown; no
 * mobile é um grupo expansível dentro do offcanvas.
 */
export function ConfigMenu({ variant }: ConfigMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || variant !== "desktop") return;

    function handlePointer(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, variant]);

  if (variant === "mobile") {
    return (
      <div>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="flex w-full items-center justify-between rounded-lg border-l-2 border-transparent px-4 py-3 text-sm font-medium text-navy-200 transition hover:bg-white/5 hover:text-white"
        >
          Config
          <ChevronDown open={open} />
        </button>
        {open ? (
          <div className="mb-1 ml-2 mt-1 rounded-lg bg-white p-3 dark:bg-navy-900">
            <BackupControls orientation="vertical" />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative flex items-center">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="config-menu"
        onClick={() => setOpen((value) => !value)}
        className="relative flex items-center gap-1 whitespace-nowrap px-3.5 text-[13px] font-medium uppercase tracking-[0.05em] text-navy-300 transition hover:text-white"
      >
        Config
        <ChevronDown open={open} />
      </button>

      {open ? (
        <div
          id="config-menu"
          className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-zinc-200 bg-white p-3 shadow-xl dark:border-navy-700 dark:bg-navy-900"
        >
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Backup dos dados
          </p>
          <BackupControls orientation="vertical" />
        </div>
      ) : null}
    </div>
  );
}
