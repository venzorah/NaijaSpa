export const CHAT_IMAGE_TTL_MS = 5 * 60 * 1000;
export const CHAT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const CHAT_IMAGE_SIZE_LABEL = "5 MB";

export function chatImageExpiresAt(sharedAt: Date) {
  return new Date(sharedAt.getTime() + CHAT_IMAGE_TTL_MS);
}

export function isChatImageLive(expiresAt: Date | string | null | undefined, now = new Date()) {
  if (!expiresAt) return true;
  const expires = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
  const at = expires.getTime();
  return Number.isFinite(at) && at > now.getTime();
}

export function mapChatMessage(
  row: {
    id: string;
    senderId: string;
    body: string;
    createdAt: Date;
    hasImage?: boolean;
    imageExpiresAt?: Date | string | null;
  },
  currentUserId: string
) {
  const expiresAt = row.imageExpiresAt ? new Date(row.imageExpiresAt) : null;
  const live = Boolean(row.hasImage) && isChatImageLive(expiresAt);
  const imageExpired = Boolean(row.imageExpiresAt) && !isChatImageLive(expiresAt);
  return {
    id: row.id,
    body: row.body,
    senderId: row.senderId,
    mine: row.senderId === currentUserId,
    createdAt: row.createdAt.toISOString(),
    hasImage: live,
    imageExpired,
    imageExpiresAt: live && expiresAt ? expiresAt.toISOString() : null
  };
}
