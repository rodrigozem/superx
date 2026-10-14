"use client";

import { SyncStatus } from "@/modules/super12/ui/sync-status";

import { UserMenu } from "./user-menu";

type HeaderUtilitiesProps = {
  name: string;
  email: string;
};

/**
 * Zona direita do header: indicador de sync + menu do usuário.
 * Client component porque SyncStatus e UserMenu são interativos.
 */
export function HeaderUtilities({ name, email }: HeaderUtilitiesProps) {
  return (
    <div className="flex items-center gap-3">
      <SyncStatus />
      <span className="h-5 w-px bg-white/10" aria-hidden />
      <UserMenu name={name} email={email} />
    </div>
  );
}
