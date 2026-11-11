import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {adminActionFeedback} from "../src/lib/action-feedback";
import {adminJson} from "../src/components/admin/json";
const events=vi.fn();beforeEach(()=>{vi.stubGlobal("window",{dispatchEvent:events});events.mockClear();});afterEach(()=>{vi.unstubAllGlobals();});
describe("platform action feedback",()=>{
 it("does not announce page loads or duplicate existing vendor/category feedback",()=>{expect(adminActionFeedback("/api/admin/settings","GET")).toBeNull();expect(adminActionFeedback("/api/vendor/services","POST")).toBeNull();expect(adminActionFeedback("/api/admin/categories","POST")).toBeNull();});
 it("announces a successful admin save after the server responds",async()=>{vi.stubGlobal("fetch",vi.fn(async()=>new Response(JSON.stringify({ok:true}))));await adminJson("/api/admin/settings",{method:"PUT"});expect(events).toHaveBeenCalledOnce();expect(events.mock.calls[0][0].detail).toEqual({kind:"success",message:"Changes saved."});});
 it("announces request failures without a success message",async()=>{vi.stubGlobal("fetch",vi.fn(async()=>new Response(JSON.stringify({error:"Save unavailable"}),{status:500})));await expect(adminJson("/api/admin/settings",{method:"PUT"})).rejects.toThrow("Save unavailable");expect(events).toHaveBeenCalledOnce();expect(events.mock.calls[0][0].detail.kind).toBe("error");});
 it("does not claim financial settlement from a successful request",()=>{expect(adminActionFeedback("/api/admin/payouts/id","PATCH")?.kind).toBe("info");});
 it("keeps cancelled background reads quiet",async()=>{vi.stubGlobal("fetch",vi.fn(async()=>{throw new DOMException("Cancelled","AbortError");}));await expect(adminJson("/api/admin/roles")).rejects.toThrow();expect(events).not.toHaveBeenCalled();});
});
