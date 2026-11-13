import {describe,expect,it} from "vitest";
import {assertPortalAccount,portalNext} from "../src/lib/portal-auth";
describe("separate account portals",()=>{
 it("accepts only the matching account type",()=>{for(const [role,portal] of [["customer","customer"],["vendor_owner","vendor"],["vendor_staff","vendor"],["super_admin","admin"]] as const)expect(()=>assertPortalAccount(role,portal)).not.toThrow();});
 it("rejects customer/vendor crossover and admin customer sessions",()=>{for(const [role,portal] of [["customer","vendor"],["vendor_owner","customer"],["vendor_staff","customer"],["super_admin","customer"],["customer","admin"]] as const)expect(()=>assertPortalAccount(role,portal)).toThrow();});
 it("rejects cross-portal return destinations",()=>{expect(portalNext("/vendor/dashboard","customer")).toBe("/account/dashboard");expect(portalNext("/account/dashboard","vendor")).toBe("/vendor/dashboard");expect(portalNext("/checkout/booking","customer")).toBe("/checkout/booking");expect(portalNext("/vendor/services","vendor")).toBe("/vendor/services");expect(portalNext("/admin/dashboard?range=7d","admin")).toBe("/admin/dashboard?range=7d");expect(portalNext("/account/bookings","admin")).toBe("/admin/dashboard");});
 it("rejects external and backslash redirects",()=>{for(const path of ["//evil.example","/\\evil.example","https://evil.example","/ vendor"])expect(portalNext(path,"customer")).toBe("/account/dashboard");});
});
