import { CustomerShell } from "@/components/shell";
import { getSession } from "@/lib/auth";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  return <CustomerShell signedIn={Boolean(user)}>{children}</CustomerShell>;
}
