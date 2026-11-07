import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
const mocks=vi.hoisted(()=>({payment:{findFirst:vi.fn(),create:vi.fn(),update:vi.fn()}}));
vi.mock("../src/lib/db",()=>({prisma:mocks}));
vi.mock("../src/lib/booking",()=>({confirmBookingFromPayment:vi.fn()}));
import {initPayment, paystackPublicKey} from "../src/lib/payments";
import {reusablePaystackCheckout} from "../src/lib/paystack-checkout";
beforeEach(()=>{vi.resetAllMocks();vi.stubEnv("PAYSTACK_SECRET_KEY","sk_live_qa");vi.stubEnv("PAYSTACK_PUBLIC_KEY","pk_live_qa");});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
describe("Paystack mode switching",()=>{
 it("never reuses test, legacy or malformed checkouts in live mode",()=>{
  for(const raw of [null,"{}","broken",JSON.stringify({paystackMode:"test"})]) expect(reusablePaystackCheckout(raw,"sk_live_qa")).toBe(false);
  expect(reusablePaystackCheckout(JSON.stringify({paystackMode:"live"}),"sk_test_qa")).toBe(false);
 });
 it("uses the runtime server public key before an older bundled public key",()=>{
  vi.stubEnv("NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY","pk_test_old");expect(paystackPublicKey()).toBe("pk_live_qa");
 });
 it("creates a fresh live checkout for a booking with an older test checkout",async()=>{
  mocks.payment.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({providerRef:"old-test",rawPayload:JSON.stringify({paystackMode:"test"})});
  mocks.payment.create.mockResolvedValue({id:"new-payment"});mocks.payment.update.mockResolvedValue({id:"new-payment"});
  const gateway=vi.fn(async()=>({json:async()=>({status:true,data:{authorization_url:"https://checkout.paystack.com/new-live",access_code:"new-live"}})}));vi.stubGlobal("fetch",gateway);
  const result=await initPayment({email:"qa@example.invalid",amountKobo:10000,purpose:"booking",bookingId:"booking"});
  expect(gateway).toHaveBeenCalledOnce();expect(result.accessCode).toBe("new-live");expect(JSON.parse(mocks.payment.update.mock.calls[0][0].data.rawPayload).paystackMode).toBe("live");
 });
 it("reuses a pending checkout when its mode matches",async()=>{
  mocks.payment.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({providerRef:"existing-live",rawPayload:JSON.stringify({paystackMode:"live"})});const gateway=vi.fn();vi.stubGlobal("fetch",gateway);
  const result=await initPayment({email:"qa@example.invalid",amountKobo:10000,purpose:"booking",bookingId:"booking"});expect(result.accessCode).toBe("existing-live");expect(gateway).not.toHaveBeenCalled();expect(mocks.payment.create).not.toHaveBeenCalled();
 });
});
