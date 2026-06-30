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

function getFileExtension(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  return extension === "jpeg" ? "jpg" : extension;
}

function stringValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function nullableString(value: FormDataEntryValue | null) {
  const text = stringValue(value);
  return text ? text : null;
}
