export const CHAT_IMAGE_TTL_MS = 10 * 60 * 1000;
export const CHAT_IMAGE_MAX_BYTES = 2 * 1024 * 1024;

export function chatImageExpiresAt(sharedAt: Date, now = new Date()) {
  return new Date(sharedAt.getTime() + CHAT_IMAGE_TTL_MS);
}

export function isChatImageLive(expiresAt: Date | string | null | undefined, now = new Date()) {
  if (!expiresAt) return false;
  const expires = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
  return expires.getTime() > now.getTime();
}

export function chatImageRemainingMs(expiresAt: Date | string | null | undefined, now = new Date()) {
  if (!expiresAt) return 0;
  const expires = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
  return Math.max(0, expires.getTime() - now.getTime());
}

export function formatChatImageCountdown(remainingMs: number) {
  const total = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
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
  const expiresAt = row.imageExpiresAt ? new Date(row.imageExpiresAt).toISOString() : null;
  const hasImage = Boolean(row.hasImage) && isChatImageLive(row.imageExpiresAt);
  return {
    id: row.id,
    body: row.body,
    senderId: row.senderId,
    mine: row.senderId === currentUserId,
    createdAt: row.createdAt.toISOString(),
    hasImage,
    imageExpiresAt: hasImage ? expiresAt : null
  };
}
