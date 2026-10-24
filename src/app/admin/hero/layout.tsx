import { requireAdminScreen } from "@/lib/admin-auth";

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireAdminScreen("cms");
  return children;
}
