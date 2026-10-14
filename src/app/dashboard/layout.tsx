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
        <div className="mx-auto grid w-full max-w-5xl grid-cols-[1fr_auto] items-center gap-x-4 px-4 sm:h-16 sm:grid-cols-[auto_auto_1fr] sm:gap-x-6 sm:px-6">
          <div className="col-start-1 row-start-1 flex h-14 items-center sm:h-16">
            <Image
              src="/logo.png"
              alt="Super X"
              width={800}
              height={366}
              priority
              className="h-8 w-auto shrink-0 sm:h-9"
            />
          </div>

          <div className="col-start-2 row-start-1 ml-auto flex h-14 items-center sm:col-start-3 sm:h-16">
            <HeaderUtilities name={user.name} email={user.email} />
          </div>

          <div className="col-span-2 row-start-2 flex h-11 border-t border-white/5 sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:h-auto sm:self-stretch sm:border-t-0">
            <NavTabs isAdmin={user.role === "admin"} />
          </div>
        </div>
      </header>

      {children}
    </div>
  );
}
