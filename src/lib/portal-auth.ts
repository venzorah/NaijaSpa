import {isAdminRole,isVendorRole,type RoleAccess} from "./rbac";
export function assertPortalAccount(account:RoleAccess,portal:"customer"|"vendor"|"admin"){
 const role=typeof account==="string"?account:account.role;
 const allowed=portal==="customer"?role==="customer":portal==="vendor"?isVendorRole(role):isAdminRole(account);
 if(!allowed)throw Object.assign(new Error(portal==="customer"?"This is not a customer account. Sign in with your customer account or use vendor login.":portal==="vendor"?"This is not a vendor account. Sign in with your vendor account or register as a therapist.":"This is not an admin account."),{status:403});
}
export function portalNext(raw:string|null|undefined,portal:"customer"|"vendor"|"admin"){
 const fallback=portal==="vendor"?"/vendor/dashboard":portal==="admin"?"/admin/dashboard":"/account/dashboard";
 if(!raw?.startsWith("/")||raw.startsWith("//")||/[\\\u0000-\u0020]/.test(raw))return fallback;
 if(portal==="vendor")return /^\/vendor(?:\/|\?|#|$)/.test(raw)?raw:fallback;
 if(portal==="admin")return /^\/admin(?:\/|\?|#|$)/.test(raw)?raw:fallback;
 return /^\/(?:vendor|admin|api|login|register|customer-access|vendor-access)(?:\/|\?|#|$)/.test(raw)?fallback:raw;
}
