import Image from "next/image";

import { requireUser } from "@/lib/dal";

import { HeaderUtilities } from "./header-utilities";
import { NavTabs } from "./nav-tabs";

export default async function DashboardLayout({
  children,
}: LayoutProps<"/dashboard">) {
  const user = await requireUser();

  return (
    <div className="flex flex-1 flex-col bg-canvas">
      <header className="sticky top-0 z-40 border-b border-white/8 bg-navy-950/92 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center gap-6 px-6 sm:px-3 sm:max-w-full">
<Image
              src="/logo.png"
              alt="Super X"
              className="h-9 w-full object-contain shrink-0"
            />

          <NavTabs isAdmin={user.role === "admin"} />

          <div className="ml-auto">
            <HeaderUtilities name={user.name} email={user.email} />
          </div>
        </div>
      </header>

      {children}
    </div>
  );
}
