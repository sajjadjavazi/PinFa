export type RegisterInput = {
  username: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  password: string;
  termsAccepted: boolean;
};

export type LoginInput = {
  identifier: string;
  password: string;
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

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9]{7,15}$/;
const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;

export function validateRegisterInput(input: unknown): ValidationResult<RegisterInput> {
  const body = isRecord(input) ? input : {};
  const username = stringValue(body.username).toLowerCase();
  const displayName = stringValue(body.displayName);
  const email = nullableLowercase(body.email);
  const phone = nullablePhone(body.phone);
  const password = stringValue(body.password);
  const termsAccepted = body.termsAccepted === true;
  const errors: Record<string, string> = {};

  if (!USERNAME_PATTERN.test(username)) {
    errors.username =
      "Username must be 3-30 characters and use lowercase letters, numbers, or underscores.";
  }

  if (displayName.length < 2 || displayName.length > 80) {
    errors.displayName = "Display name must be 2-80 characters.";
  }

  if (!email && !phone) {
    errors.contact = "Email or phone is required.";
  }

  if (email && !EMAIL_PATTERN.test(email)) {
    errors.email = "Email is invalid.";
  }

  if (phone && !PHONE_PATTERN.test(phone)) {
    errors.phone = "Phone number is invalid.";
  }

  if (password.length < 8 || password.length > 128) {
    errors.password = "Password must be 8-128 characters.";
  }

  if (!termsAccepted) {
    errors.termsAccepted = "Terms must be accepted.";
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
      username,
      displayName,
      email,
      phone,
      password,
      termsAccepted,
    },
  };
}

export function validateLoginInput(input: unknown): ValidationResult<LoginInput> {
  const body = isRecord(input) ? input : {};
  const identifier = stringValue(body.identifier).toLowerCase();
  const password = stringValue(body.password);
  const errors: Record<string, string> = {};

  if (!identifier) {
    errors.identifier = "Username, email, or phone is required.";
  }

  if (!password) {
    errors.password = "Password is required.";
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
      identifier,
      password,
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function nullableLowercase(value: unknown) {
  const text = stringValue(value).toLowerCase();
  return text ? text : null;
}

function nullablePhone(value: unknown) {
  const text = stringValue(value).replace(/[\s()-]/g, "");
  return text ? text : null;
}
