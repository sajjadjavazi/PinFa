export type ProfileUpdateInput = {
  displayName: string;
  bio: string | null;
  websiteUrl: string | null;
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

export function validateProfileUpdateInput(
  input: unknown,
): ValidationResult<ProfileUpdateInput> {
  const body = isRecord(input) ? input : {};
  const displayName = stringValue(body.displayName);
  const bio = nullableString(body.bio);
  const websiteUrl = nullableString(body.websiteUrl);
  const errors: Record<string, string> = {};

  if (displayName.length < 2 || displayName.length > 80) {
    errors.displayName = "Display name must be 2-80 characters.";
  }

  if (bio && bio.length > 500) {
    errors.bio = "Bio must be 500 characters or less.";
  }

  if (websiteUrl && !isValidWebsiteUrl(websiteUrl)) {
    errors.websiteUrl = "Website URL must be a valid http or https URL.";
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
      displayName,
      bio,
      websiteUrl,
    },
  };
}

function isValidWebsiteUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function nullableString(value: unknown) {
  const text = stringValue(value);
  return text ? text : null;
}
