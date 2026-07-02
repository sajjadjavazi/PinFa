import type { UploadLimits } from "@/lib/upload-settings";

export type PinUploadInput = {
  title: string;
  description: string | null;
  categoryId: string | null;
  file: File;
  extension: string;
};

type ValidationResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      errors: Record<string, string>;
    };

const MIME_TO_EXTENSIONS: Record<string, string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
};

const SUPPORTED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);
const IMAGE_SIGNATURES = {
  jpeg: {
    mimeType: "image/jpeg",
    extensions: ["jpg", "jpeg"],
  },
  png: {
    mimeType: "image/png",
    extensions: ["png"],
  },
  webp: {
    mimeType: "image/webp",
    extensions: ["webp"],
  },
} as const;

type DetectedImageType = keyof typeof IMAGE_SIGNATURES;

export function validatePinUploadFormData(
  formData: FormData,
  uploadLimits: UploadLimits,
): ValidationResult<PinUploadInput> {
  const title = stringValue(formData.get("title"));
  const description = nullableString(formData.get("description"));
  const categoryId = nullableString(formData.get("categoryId"));
  const file = formData.get("image");
  const errors: Record<string, string> = {};

  if (title.length < 2 || title.length > 120) {
    errors.title = "Title must be 2-120 characters.";
  }

  if (description && description.length > 1000) {
    errors.description = "Description must be 1000 characters or less.";
  }

  if (!(file instanceof File)) {
    errors.image = "Image file is required.";
  }

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      errors,
    };
  }

  const imageFile = file as File;
  const extension = getFileExtension(imageFile.name);
  const allowedExtensions = MIME_TO_EXTENSIONS[imageFile.type] ?? [];
  const maxBytes = uploadLimits.maxImageSizeMb * 1024 * 1024;

  if (
    !uploadLimits.allowedMimeTypes.includes(imageFile.type) ||
    !SUPPORTED_EXTENSIONS.has(extension) ||
    !allowedExtensions.includes(extension)
  ) {
    errors.image = "Image must be JPG, JPEG, PNG, or WEBP.";
  }

  if (imageFile.size <= 0) {
    errors.image = "Image file is empty.";
  }

  if (imageFile.size > maxBytes) {
    errors.image = `Image must be ${uploadLimits.maxImageSizeMb} MB or smaller.`;
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
      title,
      description,
      categoryId,
      file: imageFile,
      extension,
    },
  };
}

export function validateImageFileSignature(input: {
  bytes: Buffer;
  extension: string;
  mimeType: string;
}) {
  const detectedType = detectImageType(input.bytes);

  if (!detectedType) {
    return "Image file signature must be JPG, JPEG, PNG, or WEBP.";
  }

  const expected = IMAGE_SIGNATURES[detectedType];

  if (input.mimeType !== expected.mimeType) {
    return "Image file signature does not match its MIME type.";
  }

  if (!expected.extensions.some((extension) => extension === input.extension)) {
    return "Image file signature does not match its extension.";
  }

  return null;
}

function getFileExtension(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  return extension === "jpeg" ? "jpg" : extension;
}

function detectImageType(bytes: Buffer): DetectedImageType | null {
  if (hasJpegSignature(bytes)) {
    return "jpeg";
  }

  if (hasPngSignature(bytes)) {
    return "png";
  }

  if (hasWebpSignature(bytes)) {
    return "webp";
  }

  return null;
}

function hasJpegSignature(bytes: Buffer) {
  return (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  );
}

function hasPngSignature(bytes: Buffer) {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

  return (
    bytes.length >= signature.length &&
    signature.every((value, index) => bytes[index] === value)
  );
}

function hasWebpSignature(bytes: Buffer) {
  return (
    bytes.length >= 12 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  );
}

function stringValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function nullableString(value: FormDataEntryValue | null) {
  const text = stringValue(value);
  return text ? text : null;
}
