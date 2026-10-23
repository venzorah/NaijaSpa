"use client";

import { useEffect, useState } from "react";
import { GoldButton } from "./shell";

type BeforeInstall = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstall | null>(null);
  const [open, setOpen] = useState(false);
  const [ios, setIos] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem("naijaspa-install-dismissed");
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    if (standalone) {
      setInstalled(true);
      return;
    }
    const iOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIos(iOS);
    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstall);
      if (!dismissed) setOpen(true);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", () => {
      setInstalled(true);
      setOpen(false);
    });
    if (iOS && !dismissed) setTimeout(() => setOpen(true), 4000);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  if (!open || installed) return null;

  return (
    <div className="fixed inset-x-4 bottom-24 z-[70] mx-auto max-w-md rounded-3xl border border-gold/40 bg-elev p-5 shadow-2xl lg:bottom-8">
      <h2 className="font-display text-2xl font-semibold">Install NaijaSpa</h2>
      <p className="mt-2 text-sm text-ink2">
        Your favourite spa and wellness experiences, one tap away. Discover treatments, manage appointments and enjoy a
        smoother NaijaSpa experience.
      </p>
      {ios && (
        <p className="mt-3 text-xs text-ink2">
          On iPhone or iPad: tap Share, then Add to Home Screen. NaijaSpa cannot trigger that dialog for you.
        </p>
      )}
      <div className="mt-4 flex gap-2">
        <GoldButton
          onClick={async () => {
            if (deferred) {
              await deferred.prompt();
              const choice = await deferred.userChoice;
              if (choice.outcome === "accepted") setOpen(false);
            } else if (!ios) {
              alert("Use your browser menu (Install app / Apps) to install NaijaSpa.");
            }
          }}
        >
          Install App
        </GoldButton>
        <button
          type="button"
          className="min-h-11 rounded-full border border-line px-4 text-sm font-semibold"
          onClick={() => {
            localStorage.setItem("naijaspa-install-dismissed", "1");
            setOpen(false);
          }}
        >
          Maybe Later
        </button>
      </div>
    </div>
  );
}
