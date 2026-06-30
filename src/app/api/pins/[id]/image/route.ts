import { NextResponse } from "next/server";
import { canAccessAdmin } from "@/lib/admin";
import { getCurrentUser } from "@/lib/auth";
import { readStoredUpload } from "@/lib/local-upload-storage";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type ImageVariant = "original" | "thumbnail" | "feed" | "detail";

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const [pin, currentUser] = await Promise.all([
    prisma.pin.findUnique({
      where: {
        id,
      },
      include: {
        imageAsset: true,
      },
    }),
    getCurrentUser(),
  ]);

  if (!pin || !pin.imageAsset) {
    return new NextResponse(null, { status: 404 });
  }

  const variant = parseVariant(request);
  const isOwner = currentUser?.id === pin.ownerUserId;
  const isAdmin = canAccessAdmin(currentUser);
  const canView =
    variant === "original"
      ? isOwner || isAdmin
      : pin.status === "PUBLISHED" || isOwner || isAdmin;

  if (!canView) {
    return new NextResponse(null, { status: 404 });
  }

  const storageKey = getStorageKey(pin.imageAsset, variant);

  if (!storageKey) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const storedUpload = await readStoredUpload(storageKey);

    return new NextResponse(new Uint8Array(storedUpload.bytes), {
      headers: {
        "Cache-Control":
          pin.status === "PUBLISHED" ? "public, max-age=60" : "private, no-store",
        "Content-Length": String(storedUpload.size),
        "Content-Type": variant === "original" ? pin.imageAsset.mimeType : "image/webp",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}

function parseVariant(request: Request): ImageVariant {
  const variant = new URL(request.url).searchParams.get("variant");

  if (variant === "thumbnail" || variant === "feed" || variant === "detail") {
    return variant;
  }

  return "original";
}

function getStorageKey(
  imageAsset: {
    originalStorageKey: string | null;
    thumbnailStorageKey: string | null;
    feedStorageKey: string | null;
    detailStorageKey: string | null;
  },
  variant: ImageVariant,
) {
  if (variant === "thumbnail") {
    return imageAsset.thumbnailStorageKey;
  }

  if (variant === "feed") {
    return imageAsset.feedStorageKey;
  }

  if (variant === "detail") {
    return imageAsset.detailStorageKey;
  }

  return imageAsset.originalStorageKey;
}
