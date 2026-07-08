import { AdEventType } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import type { AdSlotForProvider } from "@/lib/ads/ad-provider";
import { recordAdEvent } from "@/lib/ads/ad-events";
import { getAdProvider } from "@/lib/ads/providers";
import { prisma } from "@/lib/prisma";

export async function handleAdClickEvent(request: Request) {
  const body = await readJson(request);
  const validation = validateClickInput(body);

  if (!validation.ok) {
    return NextResponse.json({ errors: validation.errors }, { status: 400 });
  }

  const slot = await prisma.adSlot.findUnique({
    where: {
      id: validation.data.slotId,
    },
    select: {
      frequencyEvery: true,
      id: true,
      isActive: true,
      name: true,
      placement: true,
      provider: true,
      providerConfigJson: true,
    },
  });

  if (!slot || !slot.isActive) {
    return NextResponse.json(
      { errors: { slotId: "Active AdSlot not found." } },
      { status: 404 },
    );
  }

  const currentUser = await getCurrentUser();
  const providerSlot: AdSlotForProvider = {
    frequencyEvery: slot.frequencyEvery,
    id: slot.id,
    name: slot.name,
    placement: slot.placement,
    provider: slot.provider,
    providerConfigJson: slot.providerConfigJson,
  };

  await recordAdEvent({
    adReference: validation.data.adReference,
    eventType: AdEventType.AD_CLICKED,
    metadataJson: {
      source: "home_feed",
    },
    placement: slot.placement,
    provider: slot.provider,
    slotId: slot.id,
    userId: currentUser?.id,
  });

  const provider = getAdProvider(slot.provider);

  try {
    await provider?.trackClick?.({
      adReference: validation.data.adReference,
      slot: providerSlot,
      userId: currentUser?.id,
    });
  } catch (error) {
    await provider?.handleFailure?.({
      error,
      phase: "click",
      slot: providerSlot,
      userId: currentUser?.id,
    });
    await recordAdEvent({
      adReference: validation.data.adReference,
      eventType: AdEventType.AD_FAILED,
      metadataJson: {
        errorMessage: getErrorMessage(error),
        phase: "click",
        source: "home_feed",
      },
      placement: slot.placement,
      provider: slot.provider,
      slotId: slot.id,
      userId: currentUser?.id,
    });
  }

  return NextResponse.json({ recorded: true });
}

async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function validateClickInput(
  input: unknown,
):
  | {
      ok: true;
      data: {
        adReference: string;
        slotId: string;
      };
    }
  | {
      ok: false;
      errors: Record<string, string>;
    } {
  if (!input || typeof input !== "object") {
    return {
      ok: false,
      errors: {
        body: "JSON body is required.",
      },
    };
  }

  const data = input as Record<string, unknown>;
  const adReference =
    typeof data.adReference === "string" ? data.adReference.trim() : "";
  const slotId = typeof data.slotId === "string" ? data.slotId.trim() : "";
  const errors: Record<string, string> = {};

  if (!adReference || adReference.length > 256) {
    errors.adReference = "Ad reference is required.";
  }

  if (!slotId || slotId.length > 128) {
    errors.slotId = "AdSlot ID is required.";
  }

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      errors,
    };
  }

  return {
    ok: true,
    data: {
      adReference,
      slotId,
    },
  };
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown ad provider error.";
}
