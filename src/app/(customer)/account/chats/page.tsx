import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { listCustomerChatThreads } from "@/lib/chat-threads";
import { PageHeader } from "@/components/page-header";
import { ChatThreadList } from "@/components/chat-thread-list";

export default async function AccountChatsPage() {
  const user = await getSession();
  if (!user) redirect("/login?next=/account/chats");
  const threads = await listCustomerChatThreads(user.id);
  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 lg:px-8">
      <PageHeader title="Chats" subtitle="Paid booking conversations with your therapist." backHref="/account" />
      <ChatThreadList
        threads={threads}
        hrefFor={(id) => `/account/chats/${id}`}
        empty="No booking chats yet. Chat opens here after Paystack confirms a booking."
      />
    </div>
  );
}
