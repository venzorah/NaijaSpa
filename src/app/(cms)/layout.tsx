import { CustomerShell } from "@/components/shell";
import { hasSessionCookie } from "@/lib/auth";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const signedIn = await hasSessionCookie();
  return <CustomerShell signedIn={signedIn}>{children}</CustomerShell>;
}
