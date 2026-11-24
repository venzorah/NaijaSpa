"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import { NIGERIA_STATES } from "@/lib/nigeria";
import { notifyAction } from "@/lib/action-feedback";
import { SHOP_ONBOARDING_STEPS, SHOP_PRODUCTS_HOME } from "@/lib/shop/onboarding";
import { VendorOnboardingDocs, type OnboardingDoc } from "@/components/vendor-onboarding-docs";
import { OTP_LENGTH, OtpBoxes } from "@/components/otp-boxes";

const fieldClass =
  "min-h-12 w-full rounded-2xl border border-line bg-card px-4 text-base text-ink outline-none placeholder:text-ink2 focus:border-gold";
const labelClass = "block text-xs font-bold uppercase tracking-[0.14em] text-goldink";

type Form = {
  businessName: string;
  description: string;
  privatePhone: string;
  privateWhatsapp: string;
  state: string;
  city: string;
  neighbourhood: string;
  address: string;
  shopNote: string;
};

const empty: Form = {
  businessName: "",
  description: "",
  privatePhone: "",
  privateWhatsapp: "",
  state: "Lagos",
  city: "",
  neighbourhood: "",
  address: "",
  shopNote: ""
};

function StoreImageSlot({
  label,
  hint,
  target,
  value,
  onChange
}: {
  label: string;
  hint: string;
  target: "logo" | "cover";
  value: string;
  onChange: (url: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("target", target);
      const res = await fetch("/api/shop/vendor/store-images", { method: "POST", body: fd });
      const data = (await res.json()) as { error?: string; url?: string };
      if (!res.ok || !data.url) throw new Error(data.error || "Could not upload image.");
      onChange(data.url);
      notifyAction("success", `${label} saved.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not upload image.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }
  return (
    <div>
      <p className={labelClass}>{label}</p>
      <p className="mt-1 text-sm text-ink2">{hint}</p>
      <button
        type="button"
        disabled={busy}
        onClick={() => input.current?.click()}
        className="mt-3 flex min-h-40 w-full items-center justify-center overflow-hidden rounded-[1.5rem] border-2 border-dashed border-gold/50 bg-elev"
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className={`h-full w-full object-cover ${target === "logo" ? "max-h-48" : "max-h-56"}`} />
        ) : (
          <span className="flex flex-col items-center gap-2 px-4 text-center text-sm text-ink2">
            <ImagePlus className="h-6 w-6 text-goldink" />
            {busy ? "Uploading…" : "Upload image"}
          </span>
        )}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        onChange={(e) => void upload(e.target.files?.[0])}
      />
      {error ? <p role="alert" className="mt-2 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}

export function ShopVendorOnboarding() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>(empty);
  const [docs, setDocs] = useState<OnboardingDoc[]>([]);
  const [logoUrl, setLogoUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [shopStatus, setShopStatus] = useState("none");
  const [email, setEmail] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [otp, setOtp] = useState("");
  const [wait, setWait] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function patch(part: Partial<Form>) {
    setForm((prev) => ({ ...prev, ...part }));
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/shop/vendor/onboarding")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !data.vendor) return;
        const v = data.vendor;
        setForm({
          businessName: v.businessName || "",
          description: v.description || "",
          privatePhone: v.privatePhone || "",
          privateWhatsapp: v.privateWhatsapp || "",
          state: v.state || "Lagos",
          city: v.address ? v.city || "" : v.city === "Lagos" ? "" : v.city || "",
          neighbourhood: v.neighbourhood || "",
          address: v.address || "",
          shopNote: v.shopNote || ""
        });
        setDocs(v.documents || []);
        setLogoUrl(v.logoUrl || "");
        setCoverUrl(v.coverUrl || "");
        setShopStatus(v.shopStatus || "none");
        setEmail(v.email || "");
        setEmailVerified(Boolean(v.emailVerified));
        setStep(Math.min(4, data.step ?? 0));
        if (data.complete) window.location.assign(SHOP_PRODUCTS_HOME);
      })
      .catch(() => setError("Could not load your store setup."))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function save(nextStep: number, submit = false) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/shop/vendor/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, step: nextStep, submit })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save this section.");
      setShopStatus(data.vendor?.shopStatus || shopStatus);
      setEmailVerified(Boolean(data.vendor?.emailVerified));
      setStep(Math.min(4, data.step ?? nextStep));
      notifyAction("success", submit ? "Application submitted for review." : "Section saved.");
      if (submit || data.complete) window.location.assign(SHOP_PRODUCTS_HOME);
    } catch (e) {
      const text = e instanceof Error ? e.message : "Could not save this section.";
      setError(text);
      notifyAction("error", text);
    } finally {
      setBusy(false);
    }
  }

  async function goBack() {
    const next = Math.max(0, step - 1);
    setStep(next);
    await fetch("/api/shop/vendor/onboarding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step: next })
    }).catch(() => undefined);
  }

  useEffect(() => {
    if (wait <= 0) return;
    const id = window.setTimeout(() => setWait((n) => n - 1), 1000);
    return () => window.clearTimeout(id);
  }, [wait]);

  const sentCode = useRef(false);
  useEffect(() => {
    if (loading || emailVerified || sentCode.current) return;
    sentCode.current = true;
    void requestEmailCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- send once after first load
  }, [loading, emailVerified]);

  async function requestEmailCode() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/shop/vendor/email-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request" })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not send a code.");
      if (data.verified) {
        setEmailVerified(true);
        setStep(1);
        return;
      }
      setWait(60);
      notifyAction("success", data.message || "Code sent.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send a code.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyEmailCode() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/shop/vendor/email-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", otp })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not verify that code.");
      setEmailVerified(true);
      notifyAction("success", "Email verified.");
      await save(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not verify that code.");
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-ink2">Loading your store setup…</p>;
  }

  const current = SHOP_ONBOARDING_STEPS[step] ?? SHOP_ONBOARDING_STEPS[0];
  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-goldink">Product seller setup</p>
      <h1 className="mt-1 font-display text-3xl">Open your store</h1>
      <p className="mt-2 text-sm text-ink2">
        Save each section. You can leave and continue from the same place. After review you can list products.
      </p>
      <ol className="mt-6 grid grid-cols-5 gap-1.5 sm:gap-2">
        {SHOP_ONBOARDING_STEPS.map((item, index) => (
          <li key={item.id}>
            <button
              type="button"
              className={`w-full rounded-2xl border px-2 py-3 text-left ${
                index === step ? "border-gold bg-gold/10" : index < step ? "border-line bg-card" : "border-line bg-elev"
              }`}
              onClick={() => index <= step && setStep(index)}
            >
              <p className="text-[10px] font-bold uppercase tracking-wide text-goldink">{index + 1}</p>
              <p className="mt-1 text-[11px] font-semibold leading-tight">{item.title}</p>
            </button>
          </li>
        ))}
      </ol>

      <div className="mt-6 rounded-[1.75rem] border border-line bg-card p-5">
        <h2 className="font-display text-2xl">{current.title}</h2>
        {step === 0 ? (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-ink2">
              We emailed a 6-digit code to <span className="font-semibold text-ink">{email || "your email"}</span>. Enter it
              here. This is the same style of code used if you reset your password.
            </p>
            <OtpBoxes id="shop-email-otp" value={otp} onChange={setOtp} disabled={busy} />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy || otp.replace(/\D/g, "").length < OTP_LENGTH}
                className="min-h-11 rounded-full bg-gold px-5 text-sm font-bold text-ongold disabled:opacity-60"
                onClick={() => void verifyEmailCode()}
              >
                {busy ? "Checking…" : "Verify email"}
              </button>
              <button
                type="button"
                disabled={busy || wait > 0}
                className="min-h-11 rounded-full border border-line px-5 text-sm font-semibold disabled:opacity-60"
                onClick={() => void requestEmailCode()}
              >
                {wait > 0 ? `Resend in ${wait}s` : "Send code"}
              </button>
            </div>
          </div>
        ) : null}
        {step === 1 ? (
          <div className="mt-4 grid gap-3">
            <label>
              <span className={labelClass}>Business name</span>
              <input className={`${fieldClass} mt-1`} value={form.businessName} onChange={(e) => patch({ businessName: e.target.value })} />
            </label>
            <label>
              <span className={labelClass}>What you sell</span>
              <textarea className={`${fieldClass} mt-1 py-3`} rows={3} value={form.description} onChange={(e) => patch({ description: e.target.value })} />
            </label>
            <label>
              <span className={labelClass}>Phone</span>
              <input className={`${fieldClass} mt-1`} value={form.privatePhone} onChange={(e) => patch({ privatePhone: e.target.value })} />
            </label>
            <label>
              <span className={labelClass}>WhatsApp</span>
              <input className={`${fieldClass} mt-1`} value={form.privateWhatsapp} onChange={(e) => patch({ privateWhatsapp: e.target.value })} />
            </label>
            <label>
              <span className={labelClass}>State</span>
              <select className={`${fieldClass} mt-1`} value={form.state} onChange={(e) => patch({ state: e.target.value })}>
                {NIGERIA_STATES.map((state) => (
                  <option key={state}>{state}</option>
                ))}
              </select>
            </label>
            <label>
              <span className={labelClass}>City</span>
              <input className={`${fieldClass} mt-1`} value={form.city} onChange={(e) => patch({ city: e.target.value })} />
            </label>
            <label>
              <span className={labelClass}>Neighbourhood</span>
              <input className={`${fieldClass} mt-1`} value={form.neighbourhood} onChange={(e) => patch({ neighbourhood: e.target.value })} />
            </label>
            <label>
              <span className={labelClass}>Address</span>
              <input className={`${fieldClass} mt-1`} value={form.address} onChange={(e) => patch({ address: e.target.value })} />
            </label>
          </div>
        ) : null}
        {step === 2 ? (
          <div className="mt-4">
            <VendorOnboardingDocs
              kinds={["id", "business_registration"]}
              intro="Upload a government ID or a CAC / business certificate. One document is enough. You can add the other if you have it."
              docs={docs}
              onChange={setDocs}
              onError={setError}
            />
          </div>
        ) : null}
        {step === 3 ? (
          <div className="mt-4 grid gap-6">
            <StoreImageSlot
              label="Store profile image"
              hint="Square logo or portrait used on your store card."
              target="logo"
              value={logoUrl}
              onChange={setLogoUrl}
            />
            <StoreImageSlot
              label="Store cover image"
              hint="Wide photo for the top of your shop page."
              target="cover"
              value={coverUrl}
              onChange={setCoverUrl}
            />
          </div>
        ) : null}
        {step === 4 ? (
          <div className="mt-4 space-y-3 text-sm">
            <p><span className="font-semibold">Email:</span> {email} {emailVerified ? "· verified" : ""}</p>
            <p><span className="font-semibold">Business:</span> {form.businessName || "—"} · {form.city || "—"}</p>
            <p><span className="font-semibold">KYC:</span> {docs.length ? `${docs.length} document uploaded` : "None yet"}</p>
            <p><span className="font-semibold">Store images:</span> {logoUrl ? "Profile" : "No profile"} · {coverUrl ? "Cover" : "No cover"}</p>
            <label>
              <span className={labelClass}>Note for admin (optional)</span>
              <textarea className={`${fieldClass} mt-1 py-3`} rows={3} value={form.shopNote} onChange={(e) => patch({ shopNote: e.target.value })} />
            </label>
            <p className="text-ink2">Submit for review. You can list products while Admin approves the store.</p>
          </div>
        ) : null}

        {error ? <p role="alert" className="mt-4 text-sm text-red-600">{error}</p> : null}

        <div className="mt-6 flex flex-wrap gap-2">
          {step > 0 ? (
            <button type="button" className="min-h-11 rounded-full border border-line px-5 text-sm font-semibold" onClick={() => void goBack()} disabled={busy}>
              Back
            </button>
          ) : null}
          {step === 0 ? null : step < 4 ? (
            <button
              type="button"
              disabled={busy}
              className="min-h-11 rounded-full bg-gold px-5 text-sm font-bold text-ongold disabled:opacity-60"
              onClick={() => {
                if (step === 1 && (form.businessName.trim().length < 2 || form.city.trim().length < 2 || form.address.trim().length < 4)) {
                  setError("Enter business name, city and address.");
                  return;
                }
                if (step === 2 && !docs.length) {
                  setError("Upload a government ID or business certificate.");
                  return;
                }
                if (step === 3 && (!logoUrl || !coverUrl)) {
                  setError("Upload both a store profile image and a cover image.");
                  return;
                }
                void save(step + 1);
              }}
            >
              {busy ? "Saving…" : "Save & continue"}
            </button>
          ) : (
            <button
              type="button"
              disabled={busy || !emailVerified}
              className="min-h-11 rounded-full bg-gold px-5 text-sm font-bold text-ongold disabled:opacity-60"
              onClick={() => void save(5, true)}
            >
              {busy ? "Submitting…" : shopStatus === "pending" ? "Save & go to products" : "Submit application"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
