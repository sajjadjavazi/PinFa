import { BoardVisibility } from "@prisma/client";

export type BoardValidationResult =
  | {
      ok: true;
      data: {
        title: string;
        description: string | null;
        visibility: BoardVisibility;
      };
    }
  | {
      ok: false;
      errors: Record<string, string>;
    };

export type BoardUpdateValidationResult =
  | {
      ok: true;
      data: {
        title?: string;
        description?: string | null;
        visibility?: BoardVisibility;
      };
    }
  | {
      ok: false;
      errors: Record<string, string>;
    };

export function validateCreateBoardInput(input: unknown): BoardValidationResult {
  const errors: Record<string, string> = {};

  if (!isRecord(input)) {
    return {
      ok: false,
      errors: {
        form: "Invalid request body.",
      },
    };
  }

  const title = typeof input.title === "string" ? input.title.trim() : "";
  const description =
    typeof input.description === "string" ? input.description.trim() : "";

  if (title.length < 2) {
    errors.title = "Board title must be at least 2 characters.";
  } else if (title.length > 80) {
    errors.title = "Board title must be 80 characters or fewer.";
  }

  if (description.length > 500) {
    errors.description = "Description must be 500 characters or fewer.";
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
      description: description || null,
      visibility: BoardVisibility.PUBLIC,
    },
  };
}

export function validateUpdateBoardInput(
  input: unknown,
): BoardUpdateValidationResult {
  const errors: Record<string, string> = {};

  if (!isRecord(input)) {
    return {
      ok: false,
      errors: {
        form: "Invalid request body.",
      },
    };
  }

  const data: {
    title?: string;
    description?: string | null;
    visibility?: BoardVisibility;
  } = {};

  if ("title" in input) {
    const title = typeof input.title === "string" ? input.title.trim() : "";

    if (title.length < 2) {
      errors.title = "Board title must be at least 2 characters.";
    } else if (title.length > 80) {
      errors.title = "Board title must be 80 characters or fewer.";
    } else {
      data.title = title;
    }
  }

  if ("description" in input) {
    const description =
      typeof input.description === "string" ? input.description.trim() : "";

    if (input.description !== null && typeof input.description !== "string") {
      errors.description = "Description must be text.";
    } else if (description.length > 500) {
      errors.description = "Description must be 500 characters or fewer.";
    } else {
      data.description = description || null;
    }
  }

  if ("visibility" in input) {
    if (input.visibility !== BoardVisibility.PUBLIC) {
      errors.visibility = "Private Boards are disabled in this MVP.";
    } else {
      data.visibility = BoardVisibility.PUBLIC;
    }
  }

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      errors,
    };
  }

  if (Object.keys(data).length === 0) {
    return {
      ok: false,
      errors: {
        form: "No Board changes were provided.",
      },
    };
  }

  return {
    ok: true,
    data,
  };
}

export async function readJsonBody(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
