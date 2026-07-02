import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { logAnalyticsError, logAnalyticsEvent } from "@/lib/analytics";
import { getCurrentUser } from "@/lib/auth";
import { processImageVariants } from "@/lib/image-processing";
import {
  deleteStoredUpload,
  deleteStoredUploads,
  storeOriginalUpload,
} from "@/lib/local-upload-storage";
import {
  validateImageFileSignature,
  validatePinUploadFormData,
} from "@/lib/pin-upload-validation";
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
  const signatureError = validateImageFileSignature({
    bytes,
    extension: validation.data.extension,
    mimeType: validation.data.file.type,
  });

  if (signatureError) {
    logAnalyticsEvent("upload.validation.failed", {
      durationMs: Date.now() - startedAt,
      fields: ["imageSignature"],
      userId: user.id,
    });

    return NextResponse.json(
      { errors: { image: signatureError } },
      { status: 400 },
    );
  }

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
          status: "UPLOADED",
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
    await prisma.imageAsset.update({
      where: {
        pinId,
      },
      data: {
        status: "PROCESSING",
        processingError: null,
      },
    });

    const processed = await processImageVariants({
      pinId,
      bytes,
    });
    processedImage = processed;

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

      const pin = await transaction.pin.update({
        where: {
          id: pinId,
        },
        data: {
          status: "PENDING_REVIEW",
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
