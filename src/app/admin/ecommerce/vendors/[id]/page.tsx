import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ShopVendorActions, ShopProductActions } from "@/components/admin/shop-actions";
import { ShopAdminError } from "@/components/admin/shop-admin-error";
import { VendorProductForm } from "@/components/vendor/shop-product-form";
import { adminShopLoad } from "@/lib/shop/admin-load";

export default async function EcommerceVendorDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { id } = await params;
  const editId = (await searchParams).edit;
  const loaded = await adminShopLoad(() =>
    prisma.vendor.findUnique({
      where: { id },
      include: {
        owner: { select: { email: true, name: true, emailVerifiedAt: true } },
        documents: { select: { id: true, kind: true, status: true } },
        shopProducts: { select: { id: true, name: true, status: true }, orderBy: { updatedAt: "desc" }, take: 40 }
      }
    })
  );
  if (!loaded.ok) {
    return (
      <div>
        <Link href="/admin/ecommerce/vendors" className="text-sm font-semibold text-goldink">
          ← Product vendors
        </Link>
        <ShopAdminError message={loaded.error} />
      </div>
    );
  }
  const vendor = loaded.data;
  if (!vendor) notFound();
  return (
    <div>
      <Link href="/admin/ecommerce/vendors" className="text-sm font-semibold text-goldink">
        ← Product vendors
      </Link>
      <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.2em] text-goldink">Seller</p>
      <h1 className="mt-1 font-display text-3xl">{vendor.businessName}</h1>
      <p className="mt-2 text-sm text-ink2">
        {vendor.city}, {vendor.state} · Shop {vendor.shopStatus} · {vendor.owner.email}
        {vendor.owner.emailVerifiedAt ? " · email verified" : " · email not verified"}
      </p>
      {vendor.shopNote ? <p className="mt-2 text-sm">{vendor.shopNote}</p> : null}
      <ShopVendorActions vendorId={vendor.id} />

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-3xl border border-line bg-card p-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-goldink">Store images</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {vendor.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={vendor.logoUrl} alt="" className="h-28 w-full rounded-2xl object-cover" />
            ) : (
              <p className="text-sm text-ink2">No profile image</p>
            )}
            {vendor.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={vendor.coverUrl} alt="" className="h-28 w-full rounded-2xl object-cover" />
            ) : (
              <p className="text-sm text-ink2">No cover</p>
            )}
          </div>
        </div>
        <div className="rounded-3xl border border-line bg-card p-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-goldink">KYC</p>
          <ul className="mt-3 space-y-2">
            {vendor.documents.map((doc) => (
              <li key={doc.id}>
                <a href={`/api/vendor/documents/${doc.id}/file`} target="_blank" rel="noreferrer" className="text-sm font-semibold text-goldink">
                  {doc.kind.replace(/_/g, " ")} · {doc.status}
                </a>
              </li>
            ))}
            {!vendor.documents.length ? <li className="text-sm text-ink2">No documents uploaded.</li> : null}
          </ul>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="font-display text-2xl">Existing products</h2>
        <ul className="mt-3 space-y-2">
          {vendor.shopProducts.map((product) => (
            <li key={product.id} className="rounded-2xl border border-line bg-card p-3">
              <p className="text-sm font-semibold">{product.name}</p>
              <p className="text-xs text-ink2">{product.status}</p>
              <p className="mt-1">
                <Link prefetch={false} href={`?edit=${product.id}#shop-product-form`} className="text-sm font-semibold text-goldink">
                  Edit listing
                </Link>
              </p>
              <ShopProductActions id={product.id} />
            </li>
          ))}
          {!vendor.shopProducts.length ? <li className="text-sm text-ink2">No products yet. List one below.</li> : null}
        </ul>
      </div>

      <div className="mt-8">
        <h2 className="font-display text-2xl">Assist listing</h2>
        <p className="mt-1 text-sm text-ink2">Create or edit a product for this seller. Admin saves go live immediately.</p>
        <VendorProductForm
          loadUrl={`/api/admin/shop/vendors/${vendor.id}`}
          saveUrl="/api/admin/shop/products"
          imageUrl="/api/admin/shop/product-images"
          extraBody={{ vendorId: vendor.id, live: true }}
          extraImage={{ vendorId: vendor.id }}
          initialEditId={editId}
        />
      </div>
    </div>
  );
}
