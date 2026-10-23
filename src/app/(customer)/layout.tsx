import { CustomerShell } from "@/components/shell";
import { LocationGate } from "@/components/location-gate";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <CustomerShell>
      <LocationGate />
      {children}
    </CustomerShell>
  );
}
