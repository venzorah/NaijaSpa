import { requireVendor } from "@/lib/vendor-auth";
import { listVendorChatThreads } from "@/lib/chat-threads";
import { VendorPageHeader } from "@/components/vendor/page-header";
import { ChatThreadList } from "@/components/chat-thread-list";

export default async function VendorChatsPage() {
  const user = await requireVendor();
  const threads = await listVendorChatThreads(user.vendorId);
  return (
    <div>
      <VendorPageHeader title="Chats" description="Paid booking conversations with your customers." />
      <ChatThreadList
        threads={threads}
        hrefFor={(id) => `/vendor/chats/${id}`}
        empty="No booking chats yet. Conversations appear here after a customer pays."
      />
    </div>
  );
}
