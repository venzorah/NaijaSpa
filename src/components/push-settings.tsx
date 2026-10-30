"use client";
import { useEffect, useState } from "react";

function keyBytes(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const decoded = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
  return Uint8Array.from(decoded, (c) => c.charCodeAt(0));
}

async function preparePushWorker() {
  const registration = await navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" });
  await registration.update();
  const worker = registration.installing || registration.waiting || registration.active;
  if (!worker) throw new Error("Notification worker is not ready. Reload and try again.");
  if (worker.state !== "activated") {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => { cleanup(); reject(new Error("Notification worker update timed out. Reload and try again.")); }, 15000);
      function cleanup() { clearTimeout(timer); worker!.removeEventListener("statechange", changed); }
      function changed() {
        if (worker!.state === "installed") worker!.postMessage({ type: "SKIP_WAITING" });
        if (worker!.state === "activated") { cleanup(); resolve(); }
        if (worker!.state === "redundant") { cleanup(); reject(new Error("Notification worker could not update. Reload and try again.")); }
      }
      worker.addEventListener("statechange", changed);
      changed();
    });
  }
  return registration;
}
export function PushSettings() {
  const [enabled, setEnabled] = useState(false), [ready, setReady] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const [supported, setSupported] = useState(false);
  useEffect(() => {
    const available = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setSupported(available);
    if (!available) return;
    void (async () => {
      try {
        const response = await fetch("/api/account/push"); if (!response.ok) return;
        const data = await response.json(); setReady(data.configured);
        const registration = await navigator.serviceWorker.getRegistration();
        const subscription = await registration?.pushManager.getSubscription();
        setEnabled(Boolean(subscription && data.endpoints?.includes(subscription.endpoint)));
      } catch { setMessage("Could not check notification settings."); }
    })();
  }, []);
  async function enable() {
    setBusy(true); setMessage("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Allow notifications in your browser's site settings, then try again.");
      const response = await fetch("/api/account/push"); const data = await response.json();
      if (!response.ok || !data.configured) throw new Error("Push notifications are not configured on the server.");
      const registration = await preparePushWorker();
      let subscription = await registration.pushManager.getSubscription();
      const expected = keyBytes(data.publicKey);
      const existing = subscription?.options.applicationServerKey;
      if (subscription && existing && !new Uint8Array(existing).every((b, i) => b === expected[i])) {
        await subscription.unsubscribe(); subscription = null;
      }
      subscription ??= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: expected });
      const saved = await fetch("/api/account/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(subscription.toJSON()) });
      if (!saved.ok) throw new Error((await saved.json()).error || "Could not save this browser's subscription.");
      setEnabled(true); setMessage("Notifications enabled on this browser.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not enable notifications."); }
    finally { setBusy(false); }
  }
  async function disable() {
    setBusy(true); setMessage("");
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        const response = await fetch("/api/account/push", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: subscription.endpoint }) });
        if (!response.ok) throw new Error("Could not disable notifications. Try again.");
        await subscription.unsubscribe();
      }
      setEnabled(false); setMessage("Notifications disabled on this browser.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not disable notifications."); }
    finally { setBusy(false); }
  }
  async function test() {
    setBusy(true); setMessage("");
    try {
      await preparePushWorker();
      const response = await fetch("/api/account/push/test", { method: "POST" }); const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not send the test notification.");
      setMessage("Test notification accepted by the push service. Check your device notifications.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not send test notification."); }
    finally { setBusy(false); }
  }
  async function testDevice() {
    setBusy(true); setMessage("");
    try {
      if (await Notification.requestPermission() !== "granted") throw new Error("Allow notifications in your browser's site settings first.");
      const registration = await preparePushWorker();
      await registration.showNotification("NaijaSpa device test", { body: "Notifications are enabled for this browser.", icon: "/icons/icon-192.png", tag: "naijaspa-device-test", data: { url: "/account/settings" } });
      const visible = await registration.getNotifications({ tag: "naijaspa-device-test" });
      setMessage(visible.length ? "The browser created the device test. If no alert appeared, check Windows notifications for your browser and Do Not Disturb." : "The browser did not retain the test notification. Check browser and device notification settings.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Device notification test failed."); }
    finally { setBusy(false); }
  }
  return <div className="mt-4 rounded-2xl border border-line p-4">
    <p className="text-sm font-semibold">Browser push notifications</p>
    <p className="mt-1 text-xs text-ink2">{!supported ? "This browser does not support push notifications. On iPhone or iPad, install the app on your Home Screen first." : !ready ? "Push notifications are not ready on this server." : enabled ? "Enabled on this browser." : "Enable alerts on this browser, including when the app is closed."}</p>
    <div className="mt-3 flex flex-wrap gap-2">
      <button type="button" disabled={!supported || !ready || busy} onClick={() => void (enabled ? disable() : enable())} className="rounded-full bg-gold px-4 py-2 text-sm font-bold text-ongold disabled:opacity-50">{enabled ? "Disable notifications" : "Enable notifications"}</button>
      {enabled ? <button type="button" disabled={busy} onClick={() => void test()} className="rounded-full border border-line px-4 py-2 text-sm disabled:opacity-50">Send test notification</button> : null}
      {supported ? <button type="button" disabled={busy} onClick={() => void testDevice()} className="rounded-full border border-line px-4 py-2 text-sm disabled:opacity-50">Test on this device</button> : null}
    </div>
    {message ? <p role="status" className="mt-2 text-xs text-ink2">{message}</p> : null}
  </div>;
}
