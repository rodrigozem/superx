"use client";

import { useEffect, useId, useState } from "react";

type HelpTipProps = {
  /** Rótulo do campo — vira o aria-label do botão. */
  label: string;
  /** Texto explicativo exibido ao clicar. */
  text: string;
};

/**
 * Botão "?" ao lado do rótulo de um campo. Clicar alterna o texto de ajuda,
 * que é irmão do botão num contêiner com `flex-wrap` (o texto usa
 * `basis-full`) — assim ele aparece abaixo do campo, sem popover nem
 * posicionamento absoluto, funcionando em qualquer layout e em mobile.
 *
 * Uso:
 *   <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
 *     <span className={labelClassName}>Modo da tabela</span>
 *     <HelpTip label="Modo da tabela" text="…" />
 *   </div>
 */
export function HelpTip({ label, text }: HelpTipProps) {
  const [open, setOpen] = useState(false);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={id}
        aria-label={`Ajuda: ${label}`}
        className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-zinc-400 text-[11px] font-bold leading-none text-zinc-500 transition hover:border-zinc-900 hover:text-zinc-900 dark:border-zinc-500 dark:text-zinc-400 dark:hover:border-zinc-100 dark:hover:text-zinc-100"
      >
        ?
      </button>
      {open ? (
        <p
          id={id}
          className="w-full basis-full rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs leading-relaxed text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
        >
          {text}
        </p>
      ) : null}
    </>
  );
}
