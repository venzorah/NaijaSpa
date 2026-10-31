"use client";

import { useRouter } from "next/navigation";
import { FilterChips } from "@/components/admin/filter-chips";
import { useOptimistic, useTransition } from "react";

export function DashboardRange({ value }: { value: "7d" | "30d" | "90d" }) {
  const router = useRouter();
  const [selected, setSelected] = useOptimistic(value);
  const [pending, startTransition] = useTransition();
  return (
    <div aria-busy={pending}>
      <FilterChips
        label="Date range"
        value={selected}
        onChange={(v) => startTransition(() => {
          setSelected(v);
          router.push(v === "30d" ? "/admin/dashboard" : `/admin/dashboard?range=${v}`);
        })}
        options={[
          { value: "7d", label: "7 days" },
          { value: "30d", label: "30 days" },
          { value: "90d", label: "90 days" }
        ]}
      />
      {pending ? <span role="status" className="sr-only">Updating date range…</span> : null}
    </div>
  );
}
