import type {ToastKind} from "./toast-feedback";
export const ACTION_FEEDBACK_EVENT="naijaspa:action-feedback";
export function notifyAction(kind:ToastKind,message:string){if(typeof window!=="undefined"&&message)window.dispatchEvent(new CustomEvent(ACTION_FEEDBACK_EVENT,{detail:{kind,message}}));}
export function adminActionFeedback(url:string,method:string){
 if(url.startsWith("/api/admin/media")&&method.toUpperCase()==="DELETE")return null;
 if(url.startsWith("/api/admin/announcements"))return null;
 if(!url.startsWith("/api/admin/")||["GET","HEAD","OPTIONS"].includes(method.toUpperCase())||url.startsWith("/api/admin/categories"))return null;
 if(/\/(payouts|refunds|payments)(\/|\?|$)/.test(url))return{kind:"info" as const,message:"Request processed. Check the financial status for the result."};
 if(url.endsWith("/ai/test"))return{kind:"success" as const,message:"AI connection test completed."};
 return{kind:"success" as const,message:method.toUpperCase()==="DELETE"?"Deleted successfully.":method.toUpperCase()==="POST"?"Created successfully.":"Changes saved."};
}
