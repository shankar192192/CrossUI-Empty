import { Prisma, ActivityType } from "@prisma/client";
import { prisma } from "./prisma";

export async function logActivity(
  tx: Prisma.TransactionClient | typeof prisma,
  params: {
    clientId: string;
    type: ActivityType;
    message: string;
    actorId?: string | null;
    metadata?: Record<string, unknown>;
  }
) {
  return tx.activity.create({
    data: {
      clientId: params.clientId,
      type: params.type,
      message: params.message,
      actorId: params.actorId ?? null,
      metadata: params.metadata as Prisma.InputJsonValue | undefined,
    },
  });
}
