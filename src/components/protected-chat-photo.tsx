"use client";

import { useEffect, useRef, useState } from "react";
import { isChatImageLive } from "@/lib/chat-images";

export function ProtectedChatPhoto({
  src,
  expiresAt,
  mine
}: {
  src: string;
  expiresAt: string | null;
  mine: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "expired" | "error">("loading");

  useEffect(() => {
    const markExpired = () => {
      if (!isChatImageLive(expiresAt)) setStatus("expired");
    };
    markExpired();
    const tick = window.setInterval(markExpired, 5000);
    return () => window.clearInterval(tick);
  }, [expiresAt]);

  useEffect(() => {
    if (!isChatImageLive(expiresAt)) {
      setStatus("expired");
      return;
    }
    let revoked = "";
    const ac = new AbortController();
    (async () => {
      try {
        const res = await fetch(src, { cache: "no-store", credentials: "same-origin", signal: ac.signal });
        if (res.status === 410) {
          setStatus("expired");
          return;
        }
        if (!res.ok) throw new Error("unavailable");
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        revoked = url;
        const image = new Image();
        await new Promise<void>((resolve, reject) => {
          image.onload = () => resolve();
          image.onerror = () => reject(new Error("decode"));
          image.src = url;
        });
        URL.revokeObjectURL(url);
        revoked = "";
        if (ac.signal.aborted) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const maxW = 320;
        const scale = Math.min(1, maxW / Math.max(1, image.width));
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("canvas");
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.rotate(-0.35);
        ctx.font = "12px Montserrat, sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.28)";
        for (let y = -40; y < canvas.height + 80; y += 42) {
          for (let x = -80; x < canvas.width + 120; x += 148) {
            ctx.fillText("NaijaSpa · expires", x, y);
          }
        }
        ctx.restore();
        if (!ac.signal.aborted) setStatus("ready");
      } catch {
        if (!ac.signal.aborted) setStatus("error");
      }
    })();
    return () => {
      ac.abort();
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [src, expiresAt]);

  if (status === "expired") {
    return <p className={`text-xs ${mine ? "text-white/80" : "text-ink2"}`}>Photo expired after 10 minutes.</p>;
  }

  return (
    <div className="relative mt-1 overflow-hidden rounded-xl" data-protected-media>
      <canvas
        ref={canvasRef}
        className={`max-w-full ${status === "ready" ? "block" : "hidden"}`}
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
      />
      {status === "loading" ? <p className={`py-6 text-xs ${mine ? "text-white/80" : "text-ink2"}`}>Loading photo…</p> : null}
      {status === "error" ? <p className={`text-xs ${mine ? "text-white/80" : "text-ink2"}`}>Photo unavailable.</p> : null}
      <div
        className="absolute inset-0"
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
        aria-hidden
      />
    </div>
  );
}
