import { NIGERIA_STATES } from "@/lib/nigeria";

export function SearchFiltersForm({
  values,
  compact
}: {
  values?: {
    q?: string;
    state?: string;
    city?: string;
    neighbourhood?: string;
    gender?: string;
    location?: string;
  };
  compact?: boolean;
}) {
  return (
    <form action="/explore" className={compact ? "mt-4 grid gap-2 rounded-3xl border border-line bg-card p-3 sm:grid-cols-2" : "mt-4 grid gap-2 rounded-3xl border border-line bg-card p-4 md:grid-cols-4"}>
      <input
        name="q"
        defaultValue={values?.q}
        placeholder="Treatment or therapist"
        className={`min-h-11 rounded-xl bg-elev px-3 text-sm ${compact ? "" : "md:col-span-2"}`}
      />
      <select name="state" defaultValue={values?.state || ""} className="min-h-11 rounded-xl bg-elev px-3 text-sm">
        <option value="">State</option>
        {NIGERIA_STATES.map((state) => (
          <option key={state} value={state}>
            {state}
          </option>
        ))}
      </select>
      <input name="city" defaultValue={values?.city} placeholder="City" className="min-h-11 rounded-xl bg-elev px-3 text-sm" />
      <input
        name="neighbourhood"
        defaultValue={values?.neighbourhood}
        placeholder="Location / area"
        className="min-h-11 rounded-xl bg-elev px-3 text-sm"
      />
      <select name="gender" defaultValue={values?.gender || ""} className="min-h-11 rounded-xl bg-elev px-3 text-sm">
        <option value="">Preferred gender</option>
        <option value="female">Female</option>
        <option value="male">Male</option>
      </select>
      <select name="location" defaultValue={values?.location || ""} className="min-h-11 rounded-xl bg-elev px-3 text-sm">
        <option value="">Spa, hotel or home</option>
        <option value="spa">Spa/Office</option>
        <option value="hotel">Hotel</option>
        <option value="home">Home</option>
      </select>
      <button className="min-h-11 rounded-full bg-gold text-sm font-bold text-ongold">Search</button>
    </form>
  );
}
