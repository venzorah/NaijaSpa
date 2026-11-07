import {prisma} from "./db";
import {PHOTOS} from "./photos";
export async function adminMediaItems(){
 const [assets,images,services,categories,vendors,staff,hero,ads]=await Promise.all([
  prisma.mediaAsset.findMany({select:{id:true,url:true,name:true},orderBy:{createdAt:"desc"}}),
  prisma.therapistGalleryImage.findMany({select:{url:true,caption:true,gallery:{select:{title:true,vendor:{select:{businessName:true}}}}}}),
  prisma.service.findMany({where:{imageUrl:{not:null}},select:{name:true,imageUrl:true}}),
  prisma.category.findMany({where:{imageUrl:{not:null}},select:{name:true,imageUrl:true}}),
  prisma.vendor.findMany({select:{businessName:true,coverUrl:true,logoUrl:true}}),
  prisma.vendorStaff.findMany({where:{photoUrl:{not:null}},select:{name:true,photoUrl:true}}),
  prisma.homeHero.findUnique({where:{id:"home"},select:{imageUrl:true}}),prisma.heroAd.findMany({select:{title:true,imageUrl:true}})
 ]);
 const map=new Map<string,{id:string|null;url:string;name:string;sources:string[];uses:number}>();
 const add=(url:string|null|undefined,name:string,source:string,id:string|null=null,used=true)=>{if(!url||(!url.startsWith("/")&&!url.startsWith("https://")))return;const old=map.get(url);if(old){old.uses+=used?1:0;if(!old.sources.includes(source))old.sources.push(source);if(id)old.id=id;}else map.set(url,{id,url,name,sources:[source],uses:used?1:0});};
 assets.forEach(a=>add(a.url,a.name,"Uploads",a.id,false));images.forEach(a=>add(a.url,a.caption||a.gallery.title+" · "+a.gallery.vendor.businessName,"Vendor galleries"));services.forEach(a=>add(a.imageUrl,a.name,"Services"));categories.forEach(a=>add(a.imageUrl,a.name,"Categories"));vendors.forEach(a=>{add(a.coverUrl,a.businessName+" cover","Business profiles");add(a.logoUrl,a.businessName+" logo","Business profiles");});staff.forEach(a=>add(a.photoUrl,a.name,"Therapists"));if(hero)add(hero.imageUrl,"Homepage banner","Homepage");ads.forEach(a=>add(a.imageUrl,a.title,"Homepage"));Object.entries(PHOTOS).forEach(([name,url])=>add(url,name,"Default images",null,false));
 return [...map.values()];
}
