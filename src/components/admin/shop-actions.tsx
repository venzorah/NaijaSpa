"use client";

export function ShopVendorActions({ vendorId }: { vendorId: string }) {
  async function setStatus(status: string) {
    await fetch("/api/shop/vendor/apply", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vendorId, status }) });
    location.reload();
  }
  return (
    <div className="mt-3 flex gap-2">
      <button type="button" className="rounded-full bg-gold px-3 py-1 text-xs font-bold text-ongold" onClick={() => void setStatus("approved")}>Approve</button>
      <button type="button" className="rounded-full border border-line px-3 py-1 text-xs" onClick={() => void setStatus("rejected")}>Reject</button>
      <button type="button" className="rounded-full border border-line px-3 py-1 text-xs" onClick={() => void setStatus("suspended")}>Suspend</button>
    </div>
  );
}

export function ShopProductActions({ id }: { id: string }) {
  async function setStatus(status: string) {
    await fetch("/api/admin/shop/products", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    location.reload();
  }
  return (
    <div className="mt-3 flex gap-2">
      <button type="button" className="rounded-full bg-gold px-3 py-1 text-xs font-bold text-ongold" onClick={() => void setStatus("approved")}>Approve</button>
      <button type="button" className="rounded-full border border-line px-3 py-1 text-xs" onClick={() => void setStatus("rejected")}>Reject</button>
      <button type="button" className="rounded-full border border-line px-3 py-1 text-xs" onClick={() => void setStatus("suspended")}>Suspend</button>
    </div>
  );
}
