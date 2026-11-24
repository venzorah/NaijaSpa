import { notifyAction } from "@/lib/action-feedback";

export const SHOP_CART_CHANGED = "naijaspa:shop-cart-changed";

export function shopSuccess(message: string) {
  notifyAction("success", message);
}

export function shopError(message: string) {
  notifyAction("error", message);
}

export function bumpShopCart() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(SHOP_CART_CHANGED));
}
