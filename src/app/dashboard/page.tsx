import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { ROLE_ROUTES } from "@/lib/constants";

export default async function DashboardIndexPage() {
  const user = await requireUser();
  redirect(ROLE_ROUTES[user.role]);
}
