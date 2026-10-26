"use client";

import { useMemo, useRef, useState } from "react";
import { filterBanks } from "@/lib/payouts";

export function BankSearchSelect({
  banks,
  value,
  onChange,
  className,
  placeholder = "Search bank name"
}: {
  banks: Array<{ code: string; name: string }>;
  value: string;
  onChange: (code: string) => void;
  className: string;
  placeholder?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const selected = banks.find((b) => b.code === value);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const list = useMemo(() => filterBanks(banks, open ? query : ""), [banks, open, query]);

  return (
    <div ref={box} className="relative">
      <input
        className={className}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder={placeholder}
        value={open ? query : selected?.name ?? ""}
        onFocus={() => {
          setQuery(selected?.name ?? "");
          setOpen(true);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (!e.target.value) onChange("");
        }}
        onBlur={() => {
          window.setTimeout(() => {
            if (!box.current?.contains(document.activeElement)) setOpen(false);
          }, 120);
        }}
      />
      {open ? (
        <ul className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-2xl border border-white/15 bg-white py-1 text-ink shadow-lg">
          {list.length === 0 ? (
            <li className="px-4 py-2 text-sm text-ink2">No bank matches that name.</li>
          ) : (
            list.slice(0, 40).map((b) => (
              <li key={b.code}>
                <button
                  type="button"
                  className={`flex min-h-11 w-full items-center px-4 text-left text-sm ${b.code === value ? "bg-gold/20 font-semibold" : "hover:bg-elev"}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange(b.code);
                    setQuery(b.name);
                    setOpen(false);
                  }}
                >
                  {b.name}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
