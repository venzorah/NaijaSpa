import { z } from "zod";
import { prisma } from "@/lib/db";
import { formImage } from "@/lib/form-file";
import { deleteGalleryImageFile } from "@/lib/gallery-media";
import { removeUnusedServiceImage, saveServiceImage, SERVICE_IMAGE_MAX_BYTES } from "@/lib/service-images";
import { createServiceWithSlug } from "./service-slugs";

const fields = {
  name: z.string().trim().min(2).max(160), categoryId: z.string().min(1),
  description: z.string().max(10000), basePriceKobo: z.number().int().positive(),
  durationMin: z.number().int().min(1).max(1440), active: z.boolean(),
  spaEnabled: z.boolean(), hotelEnabled: z.boolean(), homeEnabled: z.boolean(),
  hotelAddonKobo: z.number().int().min(0), homeAddonKobo: z.number().int().min(0),
  featuredImageId: z.string().min(1), removeFeaturedImage: z.boolean()
};
const patchSchema = z.object(fields).partial();
export const createServiceSchema = patchSchema.extend({ name: fields.name, categoryId: fields.categoryId, basePriceKobo: fields.basePriceKobo, durationMin: fields.durationMin });

export async function readServiceRequest(request: Request) {
  if (request.headers.get("content-type")?.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = formImage(form);
    if (file && file.size > SERVICE_IMAGE_MAX_BYTES) throw Object.assign(new Error("Choose an image up to 2 MB."), { status: 400 });
    let data: unknown;
    try { data = JSON.parse(String(form.get("data") || "{}")); }
    catch { throw Object.assign(new Error("Invalid service details."), { status: 400 }); }
    return { data, file };
  }
  return { data: await request.json(), file: null };
}

export async function saveService(vendorId: string, raw: unknown, file: Blob | null, id?: string) {
  const body = (id ? patchSchema : createServiceSchema).parse(raw);
  const existing = id ? await prisma.service.findFirst({ where: { id, vendorId } }) : null;
  if (id && !existing) throw Object.assign(new Error("Service not found"), { status: 404 });
  if (body.categoryId && body.categoryId !== existing?.categoryId) {
    const category = await prisma.category.findFirst({ where: { id: body.categoryId, active: true }, select: { id: true } });
    if (!category) throw Object.assign(new Error("Choose an active treatment category."), { status: 400 });
  }
  if ([!!file, !!body.featuredImageId, !!body.removeFeaturedImage].filter(Boolean).length > 1) throw Object.assign(new Error("Choose one featured-image action."), { status: 400 });
  let imageUrl: string | null | undefined;
  if (body.featuredImageId) {
    const image = await prisma.therapistGalleryImage.findFirst({ where: { id: body.featuredImageId, gallery: { vendorId } }, select: { url: true } });
    if (!image) throw Object.assign(new Error("Choose a photo from this business's gallery."), { status: 404 });
    imageUrl = image.url;
  }
  if (body.removeFeaturedImage) imageUrl = null;
  let uploaded: string | undefined;
  if (file) { uploaded = await saveServiceImage(vendorId, file); imageUrl = uploaded; }
  const { featuredImageId, removeFeaturedImage, ...details } = body;
  try {
    const service = id
      ? await prisma.service.update({ where: { id }, data: { ...details, ...(imageUrl !== undefined ? { imageUrl } : {}) } })
      : await createServiceWithSlug({ ...createServiceSchema.parse(details), vendorId, imageUrl });
    if (existing?.imageUrl && existing.imageUrl !== service.imageUrl) await removeUnusedServiceImage(existing.imageUrl).catch(() => {});
    return service;
  } catch (error) {
    if (uploaded) await deleteGalleryImageFile(uploaded).catch(() => {});
    throw error;
  }
}
