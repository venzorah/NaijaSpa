import { MessageCircle } from "lucide-react";
import { SUPPORT_WHATSAPP_DISPLAY, supportWhatsAppHref } from "@/lib/support";

export function WhatsAppSupport({
  prefill = "Hello NaijaSpa, I need help."
}: {
  prefill?: string;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 rounded-3xl border border-line bg-card p-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink">WhatsApp support</p>
        <p className="text-sm text-ink2">
          Chat with us on WhatsApp as an alternative to tickets. {SUPPORT_WHATSAPP_DISPLAY}
        </p>
      </div>
      <a
        href={supportWhatsAppHref(prefill)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-[#25D366] px-5 text-sm font-bold text-[#052e16]"
      >
        <MessageCircle className="h-4 w-4" aria-hidden />
        Chat on WhatsApp
      </a>
    </div>
  );
}
