import { prisma } from "@/lib/prisma";

export type UploadLimits = {
  maxImageSizeMb: number;
  allowedMimeTypes: string[];
};

export const DEFAULT_UPLOAD_LIMITS: UploadLimits = {
  maxImageSizeMb: 10,
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
};

export async function getUploadLimits(): Promise<UploadLimits> {
  const setting = await prisma.systemSetting.findUnique({
    where: {
      key: "upload_limits",
    },
    select: {
      valueJson: true,
    },
  });

  if (!isRecord(setting?.valueJson)) {
    return DEFAULT_UPLOAD_LIMITS;
  }

  const maxImageSizeMb = Number(setting.valueJson.maxImageSizeMb);
  const allowedMimeTypes = Array.isArray(setting.valueJson.allowedMimeTypes)
    ? setting.valueJson.allowedMimeTypes.filter(
        (mimeType): mimeType is string => typeof mimeType === "string",
      )
    : DEFAULT_UPLOAD_LIMITS.allowedMimeTypes;

  return {
    maxImageSizeMb:
      Number.isFinite(maxImageSizeMb) && maxImageSizeMb > 0
        ? maxImageSizeMb
        : DEFAULT_UPLOAD_LIMITS.maxImageSizeMb,
    allowedMimeTypes:
      allowedMimeTypes.length > 0
        ? allowedMimeTypes
        : DEFAULT_UPLOAD_LIMITS.allowedMimeTypes,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
