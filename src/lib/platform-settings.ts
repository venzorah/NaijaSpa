import {unstable_cache} from "next/cache";
import {prisma} from "./db";
export const DEFAULT_SUPPORT_EMAIL="concierge@naijaspa.com";
export const getPlatformSettings=unstable_cache(async()=>{
 const rows=await prisma.systemConfig.findMany({where:{key:{in:["settings.supportEmail","settings.pwaName","settings.defaultLocale"]}}});
 const values=Object.fromEntries(rows.map(r=>[r.key,r.value]));
 return {supportEmail:values["settings.supportEmail"]||DEFAULT_SUPPORT_EMAIL,pwaName:values["settings.pwaName"]||"NaijaSpa",defaultLocale:values["settings.defaultLocale"]||"en"};
},["platform-settings"],{tags:["platform-settings"],revalidate:300});
