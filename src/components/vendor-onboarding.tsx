"use client";
import { useToast, useToastMessage } from "@/components/vendor/toasts";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { useTheme } from "@/components/theme-provider";
import { NIGERIA_STATES, nigeriaStateLabel } from "@/lib/nigeria";
import { ListingPlanCard } from "@/components/listing-plan-card";
import { BankSearchSelect } from "@/components/bank-search-select";
import { usePayoutLookup } from "@/components/use-payout-lookup";
import { defaultVendorListingPlans, type VendorListingPlanView } from "@/lib/vendor-plans";

function LightLogo({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/brand/logo-horizontal-dark.png" alt="NaijaSpa" className={`drop-shadow-[0_1px_8px_rgba(212,175,55,0.28)] ${className ?? ""}`} />
  );
}

const fieldClass =
  "min-h-12 w-full rounded-2xl border border-line bg-card px-4 text-base text-ink outline-none placeholder:text-ink2 focus:border-gold";
const labelClass = "block text-xs font-bold uppercase tracking-[0.14em] text-goldink";

const PROVIDERS = [
  { id: "spa", title: "Spa or salon", copy: "A fixed wellness space with rooms and staff." },
  { id: "independent", title: "Independent therapist", copy: "You practise in your own name." },
  { id: "hotel", title: "Hotel spa", copy: "In-house spa for guests and walk-ins." },
  { id: "mobile", title: "Mobile / home visits", copy: "You travel to the client." }
] as const;

const STEPS = [
  { id: "type", title: "Choose your space", kicker: "Step 1 of 7" },
  { id: "business", title: "Your business", kicker: "Step 2 of 7" },
  { id: "contact", title: "Contact details", kicker: "Step 3 of 7" },
  { id: "address", title: "Where you operate", kicker: "Step 4 of 7" },
  { id: "hours", title: "Hours & policy", kicker: "Step 5 of 7" },
  { id: "plan", title: "Listing plan", kicker: "Step 6 of 7" },
  { id: "submit", title: "Review & submit", kicker: "Step 7 of 7" }
] as const;

type Form = {
  providerType: (typeof PROVIDERS)[number]["id"];
  businessName: string;
  description: string;
  privatePhone: string;
  privateWhatsapp: string;
  instagramUrl: string;
  state: string;
  city: string;
  neighbourhood: string;
  address: string;
  openTime: string;
  closeTime: string;
  cancellationPolicy: string;
  planCode: string;
  payoutBankCode: string;
  payoutAccountNumber: string;
};

const empty: Form = {
  providerType: "spa",
  businessName: "",
  description: "",
  privatePhone: "",
  privateWhatsapp: "",
  instagramUrl: "",
  state: "Lagos",
  city: "",
  neighbourhood: "",
  address: "",
  openTime: "09:00",
  closeTime: "18:00",
  cancellationPolicy: "Free cancellation up to 12 hours before the appointment.",
  planCode: "FREE",
  payoutBankCode: "",
  payoutAccountNumber: ""
};

function hoursJson(open: string, close: string) {
  const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  return JSON.stringify(Object.fromEntries(days.map((d) => [d, `${open}-${close}`])));
}

const STEP_KEY = "naijaspa-vendor-onboarding-step";

function readSavedStep(embedded: boolean) {
  try {
    const saved = Number(sessionStorage.getItem(embedded ? `${STEP_KEY}-edit` : STEP_KEY));
    if (Number.isInteger(saved) && saved >= 0) return saved;
  } catch {
    /* keep 0 */
  }
  return 0;
}

export function VendorOnboarding({ embedded = false }: { embedded?: boolean }) {
  const { theme } = useTheme();
  const [step, setStep] = useState(() => readSavedStep(embedded));
  const [maxSeen, setMaxSeen] = useState(() => readSavedStep(embedded));
  const [form, setForm] = useState<Form>(empty);
  const toast = useToast();
  const [status, setStatus] = useState("draft");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useToastMessage();
  const [done, setDone] = useState(false);
  const [banks, setBanks] = useState<Array<{ code: string; name: string }>>([]);
  const [plans, setPlans] = useState<VendorListingPlanView[]>(defaultVendorListingPlans());
  const payout = usePayoutLookup(form.payoutBankCode, form.payoutAccountNumber);

  useEffect(() => {
    void (async () => {
      try {
        fetch("/api/vendor/payout-account")
          .then((r) => r.json())
          .then((json: { banks?: Array<{ code: string; name: string }>; account?: { bankCode?: string | null; accountNumber?: string | null } }) => {
            if (json.banks?.length) setBanks(json.banks);
            if (json.account?.bankCode || json.account?.accountNumber) {
              setForm((prev) => ({
                ...prev,
                payoutBankCode: json.account?.bankCode || prev.payoutBankCode,
                payoutAccountNumber: json.account?.accountNumber || prev.payoutAccountNumber
              }));
            }
          })
          .catch(() => undefined);
        fetch("/api/listing-plans")
          .then((r) => r.json())
          .then((json: { plans?: VendorListingPlanView[] }) => {
            if (json.plans?.length) setPlans(json.plans);
          })
          .catch(() => undefined);
        const res = await fetch("/api/vendor/onboarding");
        if (!res.ok) throw new Error("Could not load your application. Please reload and try again.");
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
          instagramUrl: v.instagramUrl || "",
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
          if (
            !embedded &&
            (v.applicationStatus === "submitted" || v.applicationStatus === "under_review" || v.applicationStatus === "approved")
          ) {
            setDone(true);
          }
        }
      } catch {
        setError("Could not load your application. Please reload and try again.");
      }
    })();
  }, [embedded]);

  useEffect(() => {
    setMaxSeen((m) => Math.max(m, step));
    try {
      sessionStorage.setItem(embedded ? `${STEP_KEY}-edit` : STEP_KEY, String(step));
    } catch {
      /* ignore */
    }
  }, [step, embedded]);

  const flow = useMemo(
    () => (embedded ? STEPS.filter((s) => s.id !== "plan" && s.id !== "submit") : STEPS),
    [embedded]
  );
  const safeStep = Math.min(step, Math.max(0, flow.length - 1));
  const current = flow[safeStep] ?? flow[0];

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function valid() {
    if (safeStep === 1) return form.businessName.trim().length >= 2;
    if (safeStep === 2) return form.privatePhone.trim().length >= 8;
    if (safeStep === 3) return form.city.trim().length >= 2 && form.address.trim().length >= 4;
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
          instagramUrl: form.instagramUrl,
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
      if (form.payoutBankCode && form.payoutAccountNumber.length === 10) {
        const pay = await fetch("/api/vendor/payout-account", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bankCode: form.payoutBankCode, accountNumber: form.payoutAccountNumber })
        });
        if (!pay.ok) {
          const payJson = (await pay.json()) as { error?: string };
          setError(payJson.error || "Profile saved, but the payout account could not be verified. You can retry on Earnings.");
          if (submit) setDone(true);
          return true;
        }
      }
      if (submit) { setDone(true); toast.success("Application submitted for review."); }
      else if (embedded) setError("Saved.", "success");
      else toast.success("Progress saved.");
      return true;
    } catch {
      setError("Could not save. Check your connection.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  function goTo(i: number) {
    if (done && !embedded) return;
    if (i < 0 || i >= flow.length) return;
    if (i > maxSeen && i > step) return;
    setError("");
    setStep(i);
  }

  function back() {
    goTo(safeStep - 1);
  }

  async function next() {
    if (!valid()) {
      setError("Please complete the required fields on this screen.");
      return;
    }
    setError("");
    const ok = await save(false);
    if (ok) setStep((s) => Math.min(s + 1, flow.length - 1));
  }

  return (
    <div className={embedded ? "grid min-h-[36rem] overflow-hidden rounded-2xl border border-line bg-bg text-ink lg:grid-cols-2" : "fixed inset-0 z-[60] grid h-dvh overflow-hidden bg-bg text-ink lg:grid-cols-2"}>
      <aside className="relative hidden overflow-hidden text-white lg:block">
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

      <section className="flex h-full min-h-0 flex-col bg-card px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-5 sm:px-10 sm:pt-8">
        <div className="mb-4 flex shrink-0 items-center justify-between gap-3 lg:hidden">
          <BrandLogo className="h-9 w-auto object-contain object-left" />
          <Link href="/vendor/dashboard" className="text-xs font-semibold text-goldink">
            Dashboard
          </Link>
        </div>

        <div className="mb-5 shrink-0">
          <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-goldink">
            {safeStep > 0 && !done ? (
              <button type="button" onClick={back} className="text-left text-goldink">
                ← Previous step
              </button>
            ) : (
              <span>{done ? "Application" : current.kicker}</span>
            )}
            <Link href="/vendor/dashboard" className="hidden text-ink2 hover:text-goldink lg:inline">
              Exit
            </Link>
          </div>
          <div className="mt-4 flex gap-1.5" role="group" aria-label="Application steps">
            {flow.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-label={`Go to ${s.title}`}
                aria-current={i === safeStep ? "step" : undefined}
                disabled={busy || done || i > maxSeen}
                onClick={() => goTo(i)}
                className="flex min-h-6 flex-1 items-center rounded-full focus-visible:outline-2 focus-visible:outline-gold"
              ><span aria-hidden className={`h-1.5 w-full rounded-full ${i <= safeStep || done ? "bg-gold" : "bg-elev"}`} /></button>
            ))}
          </div>
        </div>

        <div className={`mx-auto flex min-h-0 w-full flex-1 flex-col ${safeStep === 5 ? "max-w-3xl" : "max-w-lg"}`}>
          {done ? (
            <div className="my-auto rounded-[2rem] border border-gold/30 bg-elev p-8 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-goldink">Submitted</p>
              <h2 className="mt-3 font-display text-4xl">Your spa is in review</h2>
              <p className="mt-3 text-sm text-ink2">
                Status: <span className="font-semibold text-goldink">{status.replace("_", " ")}</span>. We will email you when the listing is approved.
              </p>
              <div className="mt-8 flex flex-col items-center gap-3">
                <Link href="/vendor/dashboard" className="inline-flex min-h-12 items-center rounded-full bg-gold px-8 text-base font-bold text-ongold">
                  Go to dashboard
                </Link>
                <Link
                  href={
                    form.planCode === "FREE"
                      ? "/vendor/subscriptions"
                      : `/vendor/subscriptions/checkout?plan=${encodeURIComponent(form.planCode)}`
                  }
                  className="inline-flex min-h-12 items-center rounded-full border border-line px-8 text-base font-semibold"
                >
                  {form.planCode === "FREE" ? "View listing plans" : `Pay for ${plans.find((p) => p.code === form.planCode)?.name || "your listing plan"}`}
                </Link>
              </div>
            </div>
          ) : (
            <>
              <h2 className="font-display text-3xl leading-tight sm:text-4xl">{current.title}</h2>
              <p className="mt-1 text-sm text-ink2">{current.kicker} · You can go back any time. Your answers stay.</p>

              <div className="mt-6 min-h-0 flex-1 space-y-5 overflow-y-auto pb-5">
                {safeStep === 0 && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {PROVIDERS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        aria-pressed={form.providerType === p.id}
                        onClick={() => set("providerType", p.id)}
                        className={`rounded-3xl border p-4 text-left transition ${
                          form.providerType === p.id ? "border-gold bg-gold/10" : "border-line bg-elev hover:border-gold"
                        }`}
                      >
                        <p className="font-display text-xl">{p.title}</p>
                        <p className="mt-1 text-sm text-ink2">{p.copy}</p>
                      </button>
                    ))}
                  </div>
                )}

                {safeStep === 1 && (
                  <>
                    <label className="block space-y-2">
                      <span className={labelClass}>Business name</span>
                      <input className={fieldClass} value={form.businessName} onChange={(e) => set("businessName", e.target.value)} required />
                    </label>
                    <label className="block space-y-2">
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

                {safeStep === 2 && (
                  <>
                    <p className="text-sm text-ink2">Paid listing plans show WhatsApp, email (your login) and Instagram on Explore. Free listings keep them private until a customer pays for a booking.</p>
                    <label className="block space-y-2">
                      <span className={labelClass}>Phone</span>
                      <input className={fieldClass} inputMode="tel" value={form.privatePhone} onChange={(e) => set("privatePhone", e.target.value)} />
                    </label>
                    <label className="block space-y-2">
                      <span className={labelClass}>WhatsApp</span>
                      <input className={fieldClass} inputMode="tel" value={form.privateWhatsapp} onChange={(e) => set("privateWhatsapp", e.target.value)} />
                    </label>
                    <label className="block space-y-2">
                      <span className={labelClass}>Instagram</span>
                      <input className={fieldClass} value={form.instagramUrl} onChange={(e) => set("instagramUrl", e.target.value)} placeholder="@yourspa or instagram.com/yourspa" />
                    </label>
                    <p className="pt-2 text-sm text-ink2">Payout account — confirmed visits pay this NUBAN. Search the bank, enter the 10-digit number, and we pull the account name.</p>
                    <label className="block space-y-2">
                      <span className={labelClass}>Account number</span>
                      <input
                        className={fieldClass}
                        inputMode="numeric"
                        maxLength={10}
                        value={form.payoutAccountNumber}
                        onChange={(e) => set("payoutAccountNumber", e.target.value.replace(/\D/g, "").slice(0, 10))}
                        placeholder="10-digit NUBAN"
                      />
                    </label>
                    <label className="block space-y-2">
                      <span className={labelClass}>Payout bank</span>
                      <BankSearchSelect
                        banks={banks}
                        value={form.payoutBankCode}
                        onChange={(code) => set("payoutBankCode", code)}
                        className={fieldClass}
                      />
                    </label>
                    {payout.loading ? <p className="text-sm text-ink2">Looking up account name…</p> : null}
                    {payout.accountName ? (
                      <p className="rounded-2xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm font-semibold text-goldink">
                        Account name · {payout.accountName}
                      </p>
                    ) : null}
                    {payout.error ? <p className="text-sm text-red-700 dark:text-red-300">{payout.error}</p> : null}
                  </>
                )}

                {safeStep === 3 && (
                  <>
                    <label className="block space-y-2">
                      <span className={labelClass}>State</span>
                      <select
                        className={`${fieldClass} appearance-none`}
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
                      <p className="mt-1 text-sm text-ink2">You can take bookings from anywhere in this state. Abuja / FCT covers the whole territory.</p>
                    </label>
                    <label className="block space-y-2">
                      <span className={labelClass}>City</span>
                      <input className={fieldClass} value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Ikeja" />
                    </label>
                    <label className="block space-y-2">
                      <span className={labelClass}>Neighbourhood</span>
                      <input className={fieldClass} value={form.neighbourhood} onChange={(e) => set("neighbourhood", e.target.value)} placeholder="GRA" />
                    </label>
                    <label className="block space-y-2">
                      <span className={labelClass}>Street address</span>
                      <input className={fieldClass} value={form.address} onChange={(e) => set("address", e.target.value)} />
                    </label>
                  </>
                )}

                {safeStep === 4 && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="block space-y-2">
                        <span className={labelClass}>Opens</span>
                        <input type="time" className={fieldClass} value={form.openTime} onChange={(e) => set("openTime", e.target.value)} />
                      </label>
                      <label className="block space-y-2">
                        <span className={labelClass}>Closes</span>
                        <input type="time" className={fieldClass} value={form.closeTime} onChange={(e) => set("closeTime", e.target.value)} />
                      </label>
                    </div>
                    <label className="block space-y-2">
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

                {safeStep === 5 && (
                  <>
                    <p className="text-sm text-ink2">Therapist listing packages only. Start on Free, or pick Silver, Gold or Platinum and subscribe after you submit.</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {plans.map((plan) => (
                        <button key={plan.code} type="button" onClick={() => set("planCode", plan.code)} className="text-left">
                          <ListingPlanCard plan={plan} selected={form.planCode === plan.code} tone={theme} badge={form.planCode === plan.code ? "Selected" : undefined} />
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {safeStep === 6 && (
                  <div className="space-y-3 rounded-[1.75rem] border border-line bg-elev p-5 text-sm text-ink2">
                    <p>
                      <span className="text-goldink">Provider</span> · {PROVIDERS.find((p) => p.id === form.providerType)?.title}
                    </p>
                    <p>
                      <span className="text-goldink">Business</span> · {form.businessName || "—"}
                    </p>
                    <p>
                      <span className="text-goldink">Location</span> · {[form.neighbourhood, form.city, form.state].filter(Boolean).join(", ")}
                    </p>
                    <p>
                      <span className="text-goldink">Hours</span> · {form.openTime} – {form.closeTime}
                    </p>
                    <p>
                      <span className="text-goldink">Listing plan</span> · {plans.find((p) => p.code === form.planCode)?.name || "Free"}
                    </p>
                    <p className="text-ink2">
                      {form.planCode === "FREE"
                        ? "You start on Free. After approval you can subscribe or upgrade from Listing plans."
                        : `After you submit, open Listing plans to subscribe to ${plans.find((p) => p.code === form.planCode)?.name || form.planCode}.`}
                    </p>
                  </div>
                )}
              </div>

              {error && <p className={`mt-3 shrink-0 text-sm ${error === "Saved." ? "text-goldink" : "text-red-700 dark:text-red-300"}`}>{error}</p>}

              <div className="mt-auto flex shrink-0 gap-3 border-t border-line bg-card pt-4">
                {safeStep > 0 && (
                  <button
                    type="button"
                    onClick={back}
                    className="min-h-12 flex-1 rounded-full border border-line text-base font-semibold"
                  >
                    Back
                  </button>
                )}
                {safeStep < flow.length - 1 ? (
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
                    onClick={() => void save(!embedded)}
                    className="min-h-12 flex-[2] rounded-full bg-gold text-base font-bold text-ongold disabled:opacity-60"
                  >
                    {busy ? (embedded ? "Saving…" : "Submitting…") : embedded ? "Save changes" : "Submit for review"}
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
