export default function OnboardingPage() {
  const steps = [
    "Account",
    "Provider type",
    "Business details",
    "Contact",
    "Address",
    "Verification documents",
    "Images",
    "Services",
    "Staff",
    "Availability",
    "Cancellation policy",
    "Subscription",
    "Submit"
  ];
  return (
    <div>
      <h1 className="font-display text-3xl">Vendor onboarding</h1>
      <p className="text-sm text-ink2">States: draft → submitted → under review → approved / rejected / suspended.</p>
      <ol className="mt-6 grid gap-2 md:grid-cols-2">
        {steps.map((s, i) => (
          <li key={s} className="rounded-2xl border border-line bg-card p-4 text-sm">
            {i + 1}. {s}
          </li>
        ))}
      </ol>
    </div>
  );
}
