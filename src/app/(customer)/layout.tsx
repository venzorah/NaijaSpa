import { CustomerShell } from "@/components/shell";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <CustomerShell>{children}</CustomerShell>;
}
