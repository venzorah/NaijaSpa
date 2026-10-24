"use client";

import Link from "next/link";
import { Share, SquarePlus, Globe, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { isInAppBrowser, isStandaloneDisplay } from "@/lib/pwa-install";

function Step({ n, title, body }: { n: number; title: string; body: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-forest text-sm font-bold text-white">
        {n}
      </span>
      <div>
        <p className="font-semibold text-ink">{title}</p>
        <p className="mt-1 text-sm leading-relaxed text-ink2">{body}</p>
      </div>
    </li>
  );
}

export default function InstallPage() {
  const [inApp, setInApp] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setInApp(isInAppBrowser());
    setInstalled(isStandaloneDisplay());
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-goldink">Get the app</p>
      <h1 className="mt-2 font-display text-4xl text-forest dark:text-gold">Install NaijaSpa on iPhone</h1>
      <p className="mt-3 text-ink2">
        NaijaSpa is a web app. On Android you can tap Install. On iPhone and iPad, Apple only allows adding it from{" "}
        <strong className="text-ink">Safari</strong>.
      </p>

      {installed ? (
        <p className="mt-6 rounded-2xl border border-forest/30 bg-elev px-4 py-3 text-sm font-semibold text-forest dark:text-gold">
          You are already using the installed app. You can leave this page.
        </p>
      ) : null}

      {inApp ? (
        <p className="mt-6 rounded-2xl border border-gold/50 bg-gold/10 px-4 py-3 text-sm text-ink">
          This window is inside another app (Instagram, Facebook, WhatsApp, and similar). Tap the menu and choose{" "}
          <strong>Open in Safari</strong>, then come back to this page.
        </p>
      ) : null}

      <section className="mt-8 rounded-[1.75rem] border-2 border-forest bg-card p-5 shadow-sm sm:p-7">
        <div className="flex items-center gap-2 text-forest dark:text-gold">
          <Smartphone className="h-5 w-5" aria-hidden />
          <h2 className="font-display text-2xl">iPhone and iPad</h2>
        </div>
        <p className="mt-2 text-sm text-ink2">Use Safari only. Chrome, Firefox, and in-app browsers cannot add NaijaSpa to the Home Screen.</p>

        <ol className="mt-6 space-y-5">
          <Step
            n={1}
            title="Open Safari"
            body={
              <>
                Go to <strong>naijaspa.com</strong> in Safari. If you arrived from Instagram or WhatsApp, tap ··· or the share icon and choose Open in Safari.
              </>
            }
          />
          <Step
            n={2}
            title="Tap Share"
            body={
              <>
                On iPhone, tap the{" "}
                <Share className="mb-0.5 inline h-4 w-4 text-goldink" aria-hidden /> Share button (square with an arrow) in the
                toolbar at the <strong>bottom</strong>. On iPad it is usually at the <strong>top</strong>.
              </>
            }
          />
          <Step
            n={3}
            title="Add to Home Screen"
            body={
              <>
                Scroll the share sheet and tap{" "}
                <SquarePlus className="mb-0.5 inline h-4 w-4 text-goldink" aria-hidden /> <strong>Add to Home Screen</strong>. If
                you do not see it, you are not in Safari.
              </>
            }
          />
          <Step
            n={4}
            title="Tap Add"
            body="Edit the name if you like, then tap Add in the top right. NaijaSpa appears on your Home Screen like any other app."
          />
          <Step
            n={5}
            title="Open it from the Home Screen"
            body="Launch NaijaSpa from that icon (not from a Safari tab) so it runs full screen. Sign in from there if you want to stay logged in."
          />
        </ol>

        <div className="mt-6 rounded-2xl bg-elev p-4 text-sm text-ink2">
          <p className="font-semibold text-ink">If Share does not show Add to Home Screen</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Leave Chrome / Google App and paste naijaspa.com into Safari.</li>
            <li>On iPad, look for Share in the top Safari bar, not at the bottom.</li>
            <li>Settings → Screen Time → Content & Privacy: allow installing apps / web clips.</li>
            <li>Update iOS, then try again in a new Safari tab.</li>
          </ul>
        </div>
      </section>

      <section className="mt-6 rounded-[1.75rem] border border-line bg-card p-5 sm:p-7">
        <div className="flex items-center gap-2 text-ink">
          <Globe className="h-5 w-5 text-goldink" aria-hidden />
          <h2 className="font-display text-2xl">Android</h2>
        </div>
        <p className="mt-2 text-sm text-ink2">Chrome can install NaijaSpa for you.</p>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-ink2">
          <li>Open naijaspa.com in Chrome.</li>
          <li>Tap the banner <strong>Install App</strong>, or Chrome menu → Install app / Add to Home screen.</li>
          <li>Confirm. Open NaijaSpa from your app drawer.</li>
        </ol>
      </section>

      <p className="mt-8 text-center text-sm">
        <Link href="/" className="font-semibold text-goldink">
          Back to NaijaSpa
        </Link>
      </p>
    </div>
  );
}
