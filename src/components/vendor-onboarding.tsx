"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { NIGERIA_STATES, nigeriaStateLabel } from "@/lib/nigeria";

function LightLogo({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/brand/logo-horizontal-dark.png" alt="NaijaSpa" className={`mix-blend-screen ${className ?? ""}`} />
  );
}

const fieldClass =
  "min-h-12 w-full rounded-2xl border border-white/15 bg-white/95 px-4 text-base text-ink outline-none placeholder:text-ink2 focus:border-gold";
const labelClass = "mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-gold";

const PROVIDERS = [
  { id: "spa", title: "Spa or salon", copy: "A fixed wellness space with rooms and staff." },
  { id: "independent", title: "Independent therapist", copy: "You practise in your own name." },
  { id: "hotel", title: "Hotel spa", copy: "In-house spa for guests and walk-ins." },
  { id: "mobile", title: "Mobile / home visits", copy: "You travel to the client." }
] as const;

const STEPS = [
  { id: "type", title: "Choose your space", kicker: "Step 1 of 6" },
  { id: "business", title: "Your business", kicker: "Step 2 of 6" },
  { id: "contact", title: "Private contact", kicker: "Step 3 of 6" },
  { id: "address", title: "Where you operate", kicker: "Step 4 of 6" },
  { id: "hours", title: "Hours & policy", kicker: "Step 5 of 6" },
  { id: "submit", title: "Review & submit", kicker: "Step 6 of 6" }
] as const;

type Form = {
  providerType: (typeof PROVIDERS)[number]["id"];
  businessName: string;
  description: string;
  privatePhone: string;
  privateWhatsapp: string;
  state: string;
  city: string;
  neighbourhood: string;
  address: string;
  openTime: string;
  closeTime: string;
  cancellationPolicy: string;
};

const empty: Form = {
  providerType: "spa",
  businessName: "",
  description: "",
  privatePhone: "",
  privateWhatsapp: "",
  state: "Lagos",
  city: "",
  neighbourhood: "",
  address: "",
  openTime: "09:00",
  closeTime: "18:00",
  cancellationPolicy: "Free cancellation up to 12 hours before the appointment."
};

function hoursJson(open: string, close: string) {
  const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  return JSON.stringify(Object.fromEntries(days.map((d) => [d, `${open}-${close}`])));
}

export function VendorOnboarding() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>(empty);
  const [status, setStatus] = useState("draft");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/vendor/onboarding");
        if (!res.ok) return;
        const json = (await res.json()) as { vendor?: Partial<Form> & { hoursJson?: string; applicationStatus?: string } };
        const v = json.vendor;
        if (!v) return;
        let openTime = "09:00";
        let closeTime = "18:00";
        try {
          const hours = JSON.parse(v.hoursJson || "{}") as Record<string, string>;
          const first = Object.values(hours)[0];
          if (first?.includes("-")) {
            const [o, c] = first.split("-");
            openTime = o || openTime;
            closeTime = c || closeTime;
          }
        } catch {
          /* keep defaults */
        }
        setForm((prev) => ({
          ...prev,
          providerType: (PROVIDERS.find((p) => p.id === v.providerType)?.id ?? prev.providerType) as Form["providerType"],
          businessName: v.businessName || prev.businessName,
          description: v.description || "",
          privatePhone: v.privatePhone || "",
          privateWhatsapp: v.privateWhatsapp || "",
          state: v.state || "Lagos",
          city: v.city || "",
          neighbourhood: v.neighbourhood || "",
          address: v.address || "",
          cancellationPolicy: v.cancellationPolicy || prev.cancellationPolicy,
          openTime,
          closeTime
        }));
        if (v.applicationStatus) {
          setStatus(v.applicationStatus);
          if (v.applicationStatus === "submitted" || v.applicationStatus === "under_review" || v.applicationStatus === "approved") {
            setDone(true);
          }
        }
      } catch {
        /* stay on blank form */
      }
    })();
  }, []);

  const progress = useMemo(() => ((step + 1) / STEPS.length) * 100, [step]);
  const current = STEPS[step];

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function valid() {
    if (step === 1) return form.businessName.trim().length >= 2;
    if (step === 2) return form.privatePhone.trim().length >= 8;
    if (step === 3) return form.city.trim().length >= 2 && form.address.trim().length >= 4;
    return true;
  }

  async function save(submit = false) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/vendor/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerType: form.providerType,
          businessName: form.businessName || "My spa",
          description: form.description,
          privatePhone: form.privatePhone,
          privateWhatsapp: form.privateWhatsapp,
          state: form.state,
          city: form.city || "Lagos",
          neighbourhood: form.neighbourhood,
          address: form.address || "To be confirmed",
          cancellationPolicy: form.cancellationPolicy,
          hoursJson: hoursJson(form.openTime, form.closeTime),
          submit
        })
      });
      const json = (await res.json()) as { error?: string; applicationStatus?: string };
      if (!res.ok) {
        setError(json.error || "Could not save this step.");
        return false;
      }
      if (json.applicationStatus) setStatus(json.applicationStatus);
      if (submit) setDone(true);
      return true;
    } catch {
      setError("Could not save. Check your connection.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function next() {
    if (!valid()) {
      setError("Please complete the required fields on this screen.");
      return;
    }
    setError("");
    const ok = await save(false);
    if (ok) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  return (
    <div className="fixed inset-0 z-[60] grid bg-[#04140f] text-white lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden lg:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/photos/spa.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#04140f] via-[#064E3B]/80 to-[#064E3B]/40" />
        <div className="relative flex h-full flex-col justify-between p-10">
          <LightLogo className="h-14 w-auto object-contain object-left" />
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-gold">Seller onboarding</p>
            <h1 className="mt-4 max-w-md font-display text-5xl leading-tight">African wellness. Listed across Nigeria.</h1>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/80">
              Create your spa profile in a few screens. We review documents, then your listing goes live for bookings.
            </p>
            <ul className="mt-8 space-y-3 text-sm text-white/85">
              <li className="flex gap-3">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                Draft → submitted → under review → approved
              </li>
              <li className="flex gap-3">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                Phone and WhatsApp stay private until you unlock them
              </li>
              <li className="flex gap-3">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                Hotel and home visit add-ons can be priced later
              </li>
            </ul>
          </div>
        </div>
      </aside>

      <section className="flex min-h-0 flex-col bg-[#0b1f18] px-5 py-6 sm:px-10 sm:py-8">
        <div className="mb-6 flex items-center justify-between gap-3 lg:hidden">
          <LightLogo className="h-10 w-auto object-contain object-left" />
          <Link href="/vendor" className="text-xs font-semibold text-gold">
            Dashboard
          </Link>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.16em] text-gold">
            <span>{done ? "Application" : current.kicker}</span>
            <Link href="/vendor" className="hidden text-white/60 hover:text-gold lg:inline">
              Exit
            </Link>
          </div>
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${done ? 100 : progress}%` }} />
          </div>
          <div className="mt-3 flex gap-1.5">
            {STEPS.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-label={s.title}
                onClick={() => !done && setStep(i)}
                className={`h-1.5 flex-1 rounded-full ${i <= step || done ? "bg-gold" : "bg-white/15"}`}
              />
            ))}
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
          {done ? (
            <div className="my-auto rounded-[2rem] border border-gold/30 bg-white/[0.04] p-8 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Submitted</p>
              <h2 className="mt-3 font-display text-4xl">Your spa is in review</h2>
              <p className="mt-3 text-sm text-white/70">
                Status: <span className="font-semibold text-gold">{status.replace("_", " ")}</span>. We will email you when the listing is approved.
              </p>
              <Link href="/vendor" className="mt-8 inline-flex min-h-12 items-center rounded-full bg-gold px-8 text-base font-bold text-ongold">
                Go to dashboard
              </Link>
            </div>
          ) : (
            <>
              <p className="text-sm text-white/60">{current.kicker}</p>
              <h2 className="mt-1 font-display text-4xl">{current.title}</h2>

              <div className="mt-8 space-y-4">
                {step === 0 && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {PROVIDERS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => set("providerType", p.id)}
                        className={`rounded-3xl border p-4 text-left transition ${
                          form.providerType === p.id ? "border-gold bg-gold/10" : "border-white/10 bg-white/[0.04] hover:border-white/25"
                        }`}
                      >
                        <p className="font-display text-xl">{p.title}</p>
                        <p className="mt-1 text-sm text-white/65">{p.copy}</p>
                      </button>
                    ))}
                  </div>
                )}

                {step === 1 && (
                  <>
                    <label>
                      <span className={labelClass}>Business name</span>
                      <input className={fieldClass} value={form.businessName} onChange={(e) => set("businessName", e.target.value)} required />
                    </label>
                    <label>
                      <span className={labelClass}>About your spa</span>
                      <textarea
                        rows={4}
                        className={`${fieldClass} py-3`}
                        value={form.description}
                        onChange={(e) => set("description", e.target.value)}
                        placeholder="Signature treatments, rooms, who you serve…"
                      />
                    </label>
                  </>
                )}

                {step === 2 && (
                  <>
                    <p className="text-sm text-white/65">These stay private. Customers only see them if your plan allows public contact.</p>
                    <label>
                      <span className={labelClass}>Phone</span>
                      <input className={fieldClass} inputMode="tel" value={form.privatePhone} onChange={(e) => set("privatePhone", e.target.value)} />
                    </label>
                    <label>
                      <span className={labelClass}>WhatsApp</span>
                      <input className={fieldClass} inputMode="tel" value={form.privateWhatsapp} onChange={(e) => set("privateWhatsapp", e.target.value)} />
                    </label>
                  </>
                )}

                {step === 3 && (
                  <>
                    <label>
                      <span className={labelClass}>State</span>
                      <select
                        className={fieldClass}
                        value={form.state}
                        onChange={(e) => {
                          const state = e.target.value;
                          set("state", state);
                          if (state === "FCT" && !form.city) set("city", "Abuja");
                        }}
                      >
                        {NIGERIA_STATES.map((s) => (
                          <option key={s} value={s}>
                            {nigeriaStateLabel(s)}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-sm text-white/65">You can take bookings from anywhere in this state. Abuja / FCT covers the whole territory.</p>
                    </label>
                    <label>
                      <span className={labelClass}>City</span>
                      <input className={fieldClass} value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Ikeja" />
                    </label>
                    <label>
                      <span className={labelClass}>Neighbourhood</span>
                      <input className={fieldClass} value={form.neighbourhood} onChange={(e) => set("neighbourhood", e.target.value)} placeholder="GRA" />
                    </label>
                    <label>
                      <span className={labelClass}>Street address</span>
                      <input className={fieldClass} value={form.address} onChange={(e) => set("address", e.target.value)} />
                    </label>
                  </>
                )}

                {step === 4 && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <label>
                        <span className={labelClass}>Opens</span>
                        <input type="time" className={fieldClass} value={form.openTime} onChange={(e) => set("openTime", e.target.value)} />
                      </label>
                      <label>
                        <span className={labelClass}>Closes</span>
                        <input type="time" className={fieldClass} value={form.closeTime} onChange={(e) => set("closeTime", e.target.value)} />
                      </label>
                    </div>
                    <label>
                      <span className={labelClass}>Cancellation policy</span>
                      <textarea
                        rows={4}
                        className={`${fieldClass} py-3`}
                        value={form.cancellationPolicy}
                        onChange={(e) => set("cancellationPolicy", e.target.value)}
                      />
                    </label>
                  </>
                )}

                {step === 5 && (
                  <div className="space-y-3 rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5 text-sm text-white/80">
                    <p>
                      <span className="text-gold">Provider</span> · {PROVIDERS.find((p) => p.id === form.providerType)?.title}
                    </p>
                    <p>
                      <span className="text-gold">Business</span> · {form.businessName || "—"}
                    </p>
                    <p>
                      <span className="text-gold">Location</span> · {[form.neighbourhood, form.city, form.state].filter(Boolean).join(", ")}
                    </p>
                    <p>
                      <span className="text-gold">Hours</span> · {form.openTime} – {form.closeTime}
                    </p>
                    <p className="text-white/60">Next: add services, therapist photos, and a subscription from the vendor dashboard after review.</p>
                  </div>
                )}
              </div>

              {error && <p className="mt-4 text-sm text-red-300">{error}</p>}

              <div className="mt-auto flex gap-3 pt-8">
                {step > 0 && (
                  <button
                    type="button"
                    onClick={() => setStep((s) => s - 1)}
                    className="min-h-12 flex-1 rounded-full border border-white/20 text-base font-semibold"
                  >
                    Back
                  </button>
                )}
                {step < STEPS.length - 1 ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void next()}
                    className="min-h-12 flex-[2] rounded-full bg-gold text-base font-bold text-ongold disabled:opacity-60"
                  >
                    {busy ? "Saving…" : "Continue"}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void save(true)}
                    className="min-h-12 flex-[2] rounded-full bg-gold text-base font-bold text-ongold disabled:opacity-60"
                  >
                    {busy ? "Submitting…" : "Submit for review"}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
