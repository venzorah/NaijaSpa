import { redirect } from "next/navigation";

// Keep existing bookmarks working while billing history lives in the subscription modal.
export default function Page() {
  redirect("/vendor/subscriptions?billing=1");
}
