import { prisma } from "./db";

export async function audit(input: {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
}) {
  await prisma.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      beforeJson: input.before ? JSON.stringify(redact(input.before)) : null,
      afterJson: input.after ? JSON.stringify(redact(input.after)) : null
    }
  });
}

function redact(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const banned = ["password", "passwordHash", "token", "secret", "card", "authorization", "p256dh", "auth"];
  if (Array.isArray(value)) return value.map(redact);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (banned.some((b) => k.toLowerCase().includes(b))) out[k] = "[redacted]";
    else out[k] = redact(v);
  }
  return out;
}
