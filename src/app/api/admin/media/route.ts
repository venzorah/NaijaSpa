import {NextResponse} from "next/server";import {randomUUID} from "node:crypto";import {requireAdmin} from "@/lib/admin-auth";import {prisma} from "@/lib/db";import {jsonError} from "@/lib/http";import {formImage} from "@/lib/form-file";import {detectImageMime,extensionForMime} from "@/lib/galleries";import {putMediaObject,deleteMediaObject,uploadStorage} from "@/lib/object-storage";import {adminMediaItems} from "@/lib/admin-media";import {audit} from "@/lib/audit";
import { z } from "zod";
import { revalidateTag } from "next/cache";
import { cleanupDeletedImages, deleteAdminImages } from "@/lib/admin-media-deletion";
const permissions=["cms.manage","catalog.manage","campaigns.manage"] as const;
export async function GET(req:Request){try{await requireAdmin([...permissions]);const query=new URL(req.url).searchParams,q=(query.get("q")||"").toLowerCase(),source=query.get("source")||"all",page=Math.max(1,Number(query.get("page"))||1);const all=(await adminMediaItems()).filter(i=>(source==="all"||i.sources.includes(source))&&(!q||[i.name,...i.sources].join(" ").toLowerCase().includes(q)));return NextResponse.json({items:all.slice((page-1)*24,page*24),cleanupPending:await prisma.mediaAsset.count({where:{storageCleanupPending:true,deletedAt:{not:null}}}),total:all.length,page,pages:Math.max(1,Math.ceil(all.length/24))});}catch(e){return jsonError(e);}}
export async function POST(req:Request){try{const actor=await requireAdmin([...permissions]);const fd=await req.formData(),file=formImage(fd);if(!file||file.size>2*1024*1024)throw Object.assign(new Error("Choose an image up to 2 MB."),{status:400});const bytes=new Uint8Array(await file.arrayBuffer()),mime=detectImageMime(bytes);if(!mime)throw Object.assign(new Error("Choose a JPEG, PNG, WebP or GIF image."),{status:400});const id=randomUUID(),filename=id+"."+extensionForMime(mime),url="/api/media/library/"+filename,storage=uploadStorage();if(storage==="r2")await putMediaObject("library/"+filename,bytes,mime);const asset=await prisma.mediaAsset.create({data:{id,url,name:String(fd.get("name")||("name" in file?file.name:"Image")).slice(0,180),mime,byteSize:file.size,imagePayload:storage==="r2"?null:Buffer.from(bytes),createdById:actor.id},select:{id:true,url:true,name:true}}).catch(async e=>{if(storage==="r2")await deleteMediaObject("library/"+filename);throw e;});await audit({actorId:actor.id,action:"media.upload",entityType:"MediaAsset",entityId:id,after:asset});return NextResponse.json({asset});}catch(e){return jsonError(e);}}
export async function DELETE(req: Request) {
  try {
    const actor = await requireAdmin([...permissions]);
    const id = new URL(req.url).searchParams.get("id");
    const body = id ? null : z.object({ urls: z.array(z.string().min(1).max(2048)).min(1).max(100).optional(), retryCleanup: z.boolean().optional() }).strict().parse(await req.json());
    if (body?.retryCleanup) return NextResponse.json({ ok: true, ...await cleanupDeletedImages() });
    const asset = id ? await prisma.mediaAsset.findUnique({ where: { id }, select: { url: true } }) : null;
    if (id && !asset) return NextResponse.json({error:"Image not found"},{status:404});
    const urls = asset ? [asset.url] : body?.urls;
    if (!urls?.length) return NextResponse.json({error:"Select images to delete."},{status:400});
    const result = await deleteAdminImages(actor.id, urls);
    revalidateTag("home-catalog"); revalidateTag("home-hero");
    return NextResponse.json(result);
  } catch (error) { return jsonError(error); }
}
