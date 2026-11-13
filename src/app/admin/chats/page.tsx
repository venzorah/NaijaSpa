import { requireAdminScreen } from "@/lib/admin-auth";
import { listAdminChatThreads } from "@/lib/chat-threads";
import { AdminPageHeader } from "@/components/admin/page-header";
import { ChatThreadList } from "@/components/chat-thread-list";

export default async function AdminChatsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdminScreen("chats");
  const { q = "" } = await searchParams;
  const threads = await listAdminChatThreads(q);
  return (
    <div>
      <AdminPageHeader screen="chats" />
      <form className="mb-4 flex max-w-md gap-2" action="/admin/chats">
        <label className="sr-only" htmlFor="chat-search">
          Search chats
        </label>
        <input
          id="chat-search"
          name="q"
          defaultValue={q}
          placeholder="Search customer, therapist or service…"
          className="h-11 min-w-0 flex-1 rounded-lg border border-line bg-bg px-3 text-sm"
        />
        <button type="submit" className="h-11 rounded-lg bg-gold px-4 text-sm font-semibold text-ongold">
          Search
        </button>
      </form>
      <ChatThreadList
        threads={threads}
        hrefFor={(id) => `/admin/chats/${id}`}
        empty="No customer–therapist chats yet."
      />
    </div>
  );
}
