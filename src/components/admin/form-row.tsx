export function FormRow({
  label,
  htmlFor,
  hint,
  children
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="text-xs font-medium">
        {label}
      </label>
      <div className="mt-1">{children}</div>
      {hint ? <p className="mt-1 text-[11px] text-ink2">{hint}</p> : null}
    </div>
  );
}

export const adminField = "w-full rounded-xl border border-line bg-elev px-3 py-2 text-sm";
export const adminBtn =
  "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full bg-gold px-4 text-xs font-bold text-ongold disabled:opacity-50";
export const adminBtnOutline =
  "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full border border-line px-4 text-xs font-semibold disabled:opacity-50";
export const adminBtnGhost =
  "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold text-ink2 hover:bg-elev disabled:opacity-50";
