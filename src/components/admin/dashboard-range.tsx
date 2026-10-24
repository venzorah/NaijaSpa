"use client";

import { useRouter } from "next/navigation";
import { FilterChips } from "@/components/admin/filter-chips";

export function DashboardRange({ value }: { value: "7d" | "30d" | "90d" }) {
  const router = useRouter();
  return (
    <FilterChips
      label="Date range"
      value={value}
      onChange={(v) => router.push(v === "30d" ? "/admin" : `/admin?range=${v}`)}
      options={[
        { value: "7d", label: "7 days" },
        { value: "30d", label: "30 days" },
        { value: "90d", label: "90 days" }
      ]}
    />
  );
}
