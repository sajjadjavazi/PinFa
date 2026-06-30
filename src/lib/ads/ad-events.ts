import type {
  AdEventType,
  AdPlacement,
  AdProvider as PrismaAdProvider,
  Prisma,
} from "@prisma/client";
import { logAnalyticsError } from "@/lib/analytics";
import { prisma } from "@/lib/prisma";

export async function recordAdEvent(input: {
  adReference?: string | null;
  eventType: AdEventType;
  metadataJson?: Prisma.InputJsonValue;
  placement: AdPlacement;
  provider: PrismaAdProvider;
  sessionId?: string | null;
  slotId?: string | null;
  userId?: string | null;
}) {
  try {
    await prisma.adEvent.create({
      data: {
        adReference: input.adReference ?? undefined,
        eventType: input.eventType,
        metadataJson: input.metadataJson,
        placement: input.placement,
        provider: input.provider,
        sessionId: input.sessionId ?? undefined,
        slotId: input.slotId ?? undefined,
        userId: input.userId ?? undefined,
      },
    });
  } catch (error) {
    logAnalyticsError("ads.event_record.failed", error, {
      eventType: input.eventType,
      placement: input.placement,
      provider: input.provider,
      slotId: input.slotId ?? null,
      userId: input.userId ?? null,
    });
  }
}
