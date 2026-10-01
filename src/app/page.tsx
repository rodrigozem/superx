import { redirect } from "next/navigation";

import { getSession } from "@/lib/dal";

export default async function Home() {
  const session = await getSession();
  return redirect(session ? "/dashboard" : "/login");
}
