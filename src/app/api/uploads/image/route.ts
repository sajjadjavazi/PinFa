import { randomUUID } from "crypto";
import { ModerationDecision, NotificationType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { logAnalyticsError, logAnalyticsEvent } from "@/lib/analytics";
import { getCurrentUser } from "@/lib/auth";
import { processImageVariants } from "@/lib/image-processing";
import { moderateImageWithSafeSearch } from "@/lib/moderation/moderate-image";
import {
  deleteStoredUpload,
  deleteStoredUploads,
  storeOriginalUpload,
} from "@/lib/local-upload-storage";
import { validatePinUploadFormData } from "@/lib/pin-upload-validation";
import { createNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { getUploadLimits } from "@/lib/upload-settings";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { errors: { auth: "Authentication required." } },
      { status: 401 },
    );
  }

  const [formData, uploadLimits] = await Promise.all([
    request.formData(),
    getUploadLimits(),
  ]);
  const validation = validatePinUploadFormData(formData, uploadLimits);

  if (!validation.ok) {
    logAnalyticsEvent("upload.validation.failed", {
      durationMs: Date.now() - startedAt,
      fields: Object.keys(validation.errors),
      userId: user.id,
    });

    return NextResponse.json({ errors: validation.errors }, { status: 400 });
  }

  if (validation.data.categoryId) {
    const category = await prisma.category.findFirst({
      where: {
        id: validation.data.categoryId,
        status: "ACTIVE",
      },
      select: {
        id: true,
      },
    });

    if (!category) {
      logAnalyticsEvent("upload.category.invalid", {
        categoryId: validation.data.categoryId,
        durationMs: Date.now() - startedAt,
        userId: user.id,
      });

      return NextResponse.json(
        { errors: { categoryId: "Selected category is invalid." } },
        { status: 400 },
      );
    }
  }

  const pinId = randomUUID();
  const bytes = Buffer.from(await validation.data.file.arrayBuffer());
  const storedUpload = await storeOriginalUpload({
    pinId,
    extension: validation.data.extension,
    bytes,
  });

  try {
    await prisma.$transaction([
      prisma.pin.create({
        data: {
          id: pinId,
          ownerUserId: user.id,
          categoryId: validation.data.categoryId,
          title: validation.data.title,
          description: validation.data.description,
          status: "PROCESSING",
          imageOriginalUrl: `/api/pins/${pinId}/image`,
        },
      }),
      prisma.imageAsset.create({
        data: {
          pinId,
          ownerUserId: user.id,
          status: "PROCESSING",
          originalStorageKey: storedUpload.storageKey,
          mimeType: validation.data.file.type,
          originalSizeBytes: validation.data.file.size,
        },
      }),
    ]);
  } catch (error) {
    await deleteStoredUpload(storedUpload.storageKey);
    logAnalyticsError("upload.database_create.failed", error, {
      durationMs: Date.now() - startedAt,
      pinId,
      userId: user.id,
    });
    throw error;
  }

  let processedImage: Awaited<ReturnType<typeof processImageVariants>> | null =
    null;

  try {
    const processed = await processImageVariants({
      pinId,
      bytes,
    });
    processedImage = processed;
    const moderation = await moderateImageWithSafeSearch({
      image: bytes,
    });

    const pin = await prisma.$transaction(async (transaction) => {
      await transaction.imageAsset.update({
        where: {
          pinId,
        },
        data: {
          status: "READY",
          thumbnailStorageKey: processed.variants.thumbnail.storageKey,
          feedStorageKey: processed.variants.feed.storageKey,
          detailStorageKey: processed.variants.detail.storageKey,
          processedSizeBytes: processed.processedSizeBytes,
          width: processed.width,
          height: processed.height,
          processingError: null,
        },
      });

      await transaction.moderationResult.create({
        data: {
          pinId,
          provider: moderation.provider,
          adultLikelihood: moderation.adultLikelihood,
          racyLikelihood: moderation.racyLikelihood,
          violenceLikelihood: moderation.violenceLikelihood,
          medicalLikelihood: moderation.medicalLikelihood,
          spoofLikelihood: moderation.spoofLikelihood,
          decision: moderation.decision,
          rawResponseJson: moderation.rawResponseJson,
        },
      });

      const pin = await transaction.pin.update({
        where: {
          id: pinId,
        },
        data: {
          status: moderation.pinStatus,
          imageThumbnailUrl: `/api/pins/${pinId}/image?variant=thumbnail`,
          imageFeedUrl: `/api/pins/${pinId}/image?variant=feed`,
          imageDetailUrl: `/api/pins/${pinId}/image?variant=detail`,
          width: processed.width,
          height: processed.height,
        },
        select: {
          id: true,
          title: true,
          status: true,
          imageThumbnailUrl: true,
          imageFeedUrl: true,
          imageDetailUrl: true,
          width: true,
          height: true,
        },
      });

      if (
        moderation.decision === ModerationDecision.AUTO_APPROVED ||
        moderation.decision === ModerationDecision.AUTO_REJECTED
      ) {
        await createNotification(
          {
            message:
              moderation.decision === ModerationDecision.AUTO_APPROVED
                ? `Your Pin "${pin.title}" was approved.`
                : `Your Pin "${pin.title}" was rejected.`,
            targetId: pinId,
            targetType: "PIN",
            type:
              moderation.decision === ModerationDecision.AUTO_APPROVED
                ? NotificationType.PIN_APPROVED
                : NotificationType.PIN_REJECTED,
            userId: user.id,
          },
          transaction,
        );
      }

      return pin;
    });

    logAnalyticsEvent("upload.processed", {
      durationMs: Date.now() - startedAt,
      pinId,
      pinStatus: pin.status,
      userId: user.id,
    });

    return NextResponse.json({ pin }, { status: 201 });
  } catch (error) {
    if (processedImage) {
      await deleteStoredUploads([
        processedImage.variants.thumbnail.storageKey,
        processedImage.variants.feed.storageKey,
        processedImage.variants.detail.storageKey,
      ]);
    }

    const message =
      error instanceof Error ? error.message : "Image processing failed.";
    logAnalyticsError("upload.processing.failed", error, {
      durationMs: Date.now() - startedAt,
      pinId,
      userId: user.id,
    });
    const pin = await prisma.pin.update({
      where: {
        id: pinId,
      },
      data: {
        status: "PENDING_REVIEW",
        imageThumbnailUrl: null,
        imageFeedUrl: null,
        imageDetailUrl: null,
      },
      select: {
        id: true,
        title: true,
        status: true,
        imageThumbnailUrl: true,
        imageFeedUrl: true,
        imageDetailUrl: true,
      },
    });

    await prisma.imageAsset.update({
      where: {
        pinId,
      },
      data: {
        status: "FAILED",
        processingError: message,
      },
    });

    return NextResponse.json(
      {
        pin,
        errors: {
          image: "Image was uploaded but processing failed.",
        },
      },
      { status: 202 },
    );
  }
}
