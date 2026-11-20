"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Share, SquarePlus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { GoldButton } from "./gold-button";
import {
  INSTALL_SHOW_DELAY_MS,
  NAIJASPA_CAN_INSTALL,
  bindInstallPromptCapture,
  isAppleMobile,
  isInAppBrowser,
  isInstallDismissed,
  isStandaloneDisplay,
  markInstallDismissed,
  peekInstallPrompt,
  takeInstallPrompt
} from "@/lib/pwa-install";

export function InstallPrompt() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [ios, setIos] = useState(false);
  const [inApp, setInApp] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [hint, setHint] = useState("");
  const [busy, setBusy] = useState(false);
  const shown = useRef(false);

  useEffect(() => {
    bindInstallPromptCapture();
    if (isStandaloneDisplay()) {
      setInstalled(true);
      return;
    }
    if (isInstallDismissed()) return;

    const apple = isAppleMobile();
    setIos(apple);
    setInApp(isInAppBrowser());

    let delayDone = false;
    const maybeShow = () => {
      if (!delayDone || shown.current || isInstallDismissed() || isStandaloneDisplay()) return;
      if (!apple && !peekInstallPrompt() && !isInAppBrowser()) return;
      shown.current = true;
      setOpen(true);
    };

    const start = window.setTimeout(() => {
      delayDone = true;
      maybeShow();
    }, INSTALL_SHOW_DELAY_MS);
    const onReady = () => maybeShow();
    const onInstalled = () => {
      setInstalled(true);
      setOpen(false);
    };

    window.addEventListener(NAIJASPA_CAN_INSTALL, onReady);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.clearTimeout(start);
      window.removeEventListener(NAIJASPA_CAN_INSTALL, onReady);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!open || installed || path === "/install") return null;

  function dismiss() {
    markInstallDismissed();
    setOpen(false);
  }

  async function install() {
    if (busy) return;
    const promptEvent = peekInstallPrompt();
    if (!promptEvent) {
      setHint("Open the Chrome menu and tap Install app / Add to Home screen.");
      return;
    }
    setBusy(true);
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      takeInstallPrompt();
      if (choice.outcome === "accepted") {
        setOpen(false);
        setInstalled(true);
      } else {
        dismiss();
      }
    } catch {
      setHint("Open the Chrome menu and tap Install app / Add to Home screen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-x-4 z-[60] mx-auto max-w-md rounded-3xl border border-gold/40 bg-elev p-5 shadow-2xl max-lg:bottom-[calc(5.75rem+env(safe-area-inset-bottom))] lg:bottom-8">
      <h2 className="font-display text-2xl font-semibold">Install NaijaSpa</h2>
      {ios ? (
        <div className="mt-3 space-y-3 text-sm text-ink2">
          {inApp ? (
            <p>
              You are inside another app’s browser. Tap the menu and choose <strong className="text-ink">Open in Safari</strong>, then follow the steps.
            </p>
          ) : (
            <p>Apple does not allow an Install button. Add NaijaSpa from Safari:</p>
          )}
          <ol className="space-y-2 text-ink">
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-forest text-xs font-bold text-white">1</span>
              <span>Open this site in <strong>Safari</strong> (not Chrome or Instagram).</span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-forest text-xs font-bold text-white">2</span>
              <span className="flex items-center gap-1.5">
                Tap <Share className="inline h-4 w-4 text-goldink" aria-hidden /> Share, then{" "}
                <SquarePlus className="inline h-4 w-4 text-goldink" aria-hidden /> Add to Home Screen.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-forest text-xs font-bold text-white">3</span>
              <span>Tap Add. Open the NaijaSpa icon on your Home Screen.</span>
            </li>
          </ol>
          <Link href="/install" className="inline-block font-semibold text-goldink">
            Full iPhone guide →
          </Link>
        </div>
      ) : (
        <p className="mt-2 text-sm text-ink2">
          {hint || "Your favourite spa and wellness experiences, one tap away. Discover treatments, manage appointments and enjoy a smoother NaijaSpa experience."}
        </p>
      )}
      <div className="mt-4 flex gap-2">
        {ios ? (
          <Link
            href="/install"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-gold px-5 text-sm font-bold text-ongold"
          >
            How to install
          </Link>
        ) : (
          <GoldButton type="button" disabled={busy} onClick={() => void install()}>
            {busy ? "Opening…" : "Install App"}
          </GoldButton>
        )}
        <button type="button" className="min-h-11 rounded-full border border-line px-4 text-sm font-semibold" onClick={dismiss}>
          Maybe Later
        </button>
      </div>
    </div>
  );
}
