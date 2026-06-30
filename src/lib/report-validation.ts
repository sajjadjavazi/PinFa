import { ReportReason, ReportTargetType } from "@prisma/client";

export type ReportValidationResult =
  | {
      ok: true;
      data: {
        description: string | null;
        reason: ReportReason;
        targetId: string;
        targetType: ReportTargetType;
      };
    }
  | {
      ok: false;
      errors: Record<string, string>;
    };

const reportReasons = new Set<string>(Object.values(ReportReason));
const reportTargetTypes = new Set<string>(Object.values(ReportTargetType));

export function validateReportInput(input: unknown): ReportValidationResult {
  if (!isRecord(input)) {
    return {
      ok: false,
      errors: {
        form: "Invalid request body.",
      },
    };
  }

  const errors: Record<string, string> = {};
  const targetType = typeof input.targetType === "string" ? input.targetType : "";
  const targetId = typeof input.targetId === "string" ? input.targetId.trim() : "";
  const reason = typeof input.reason === "string" ? input.reason : "";
  const description =
    typeof input.description === "string" ? input.description.trim() : "";

  if (!reportTargetTypes.has(targetType)) {
    errors.targetType = "Report target is invalid.";
  }

  if (!targetId) {
    errors.targetId = "Report target is required.";
  }

  if (!reportReasons.has(reason)) {
    errors.reason = "Report reason is invalid.";
  }

  if (description.length > 1000) {
    errors.description = "Description must be 1000 characters or fewer.";
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
      description: description || null,
      reason: reason as ReportReason,
      targetId,
      targetType: targetType as ReportTargetType,
    },
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
