import { Suspense } from "react";
import { getSession } from "@/lib/auth";
import { BookForm } from "@/components/book-form";

export default async function BookPage() {
  const user = await getSession();
  return (
    <Suspense fallback={<div className="mx-auto w-full min-w-0 max-w-lg px-4 py-8 text-sm text-ink2">Loading booking…</div>}>
      <BookForm loggedIn={user?.role === "customer"} />
    </Suspense>
  );
}
