import sharp, { type FitEnum, type OutputInfo } from "sharp";
import {
  deleteStoredUploads,
  type ImageVariantName,
  storeImageVariant,
  type StoredUpload,
} from "@/lib/local-upload-storage";

type VariantDefinition = {
  name: ImageVariantName;
  width: number;
  height?: number;
  fit: keyof FitEnum;
  quality: number;
};

type ProcessedVariant = {
  storageKey: string;
  sizeBytes: number;
  width: number;
  height: number;
};

export type ProcessedImageResult = {
  width: number;
  height: number;
  processedSizeBytes: number;
  variants: Record<ImageVariantName, ProcessedVariant>;
};

const VARIANTS: VariantDefinition[] = [
  {
    name: "thumbnail",
    width: 320,
    height: 320,
    fit: "cover",
    quality: 78,
  },
  {
    name: "feed",
    width: 736,
    fit: "inside",
    quality: 82,
  },
  {
    name: "detail",
    width: 1600,
    fit: "inside",
    quality: 86,
  },
];

export async function processImageVariants(input: {
  pinId: string;
  bytes: Buffer;
}): Promise<ProcessedImageResult> {
  const entries: Array<readonly [ImageVariantName, ProcessedVariant]> = [];

  try {
    for (const variant of VARIANTS) {
      const processed = await sharp(input.bytes, { failOn: "warning" })
        .rotate()
        .resize({
          width: variant.width,
          height: variant.height,
          fit: variant.fit,
          withoutEnlargement: true,
        })
        .webp({ quality: variant.quality })
        .toBuffer({ resolveWithObject: true });

      const storedVariant = await storeImageVariant({
        pinId: input.pinId,
        variant: variant.name,
        bytes: processed.data,
      });

      entries.push([
        variant.name,
        toProcessedVariant(storedVariant, processed.data, processed.info),
      ]);
    }
  } catch (error) {
    await deleteStoredUploads(entries.map((entry) => entry[1].storageKey));
    throw error;
  }

  const variants = Object.fromEntries(entries) as Record<
    ImageVariantName,
    ProcessedVariant
  >;
  const detail = variants.detail;

  return {
    width: detail.width,
    height: detail.height,
    processedSizeBytes: Object.values(variants).reduce(
      (total, variant) => total + variant.sizeBytes,
      0,
    ),
    variants,
  };
}

function toProcessedVariant(
  storedVariant: StoredUpload,
  bytes: Buffer,
  info: OutputInfo,
): ProcessedVariant {
  return {
    storageKey: storedVariant.storageKey,
    sizeBytes: bytes.byteLength,
    width: info.width,
    height: info.height,
  };
}
