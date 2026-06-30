import { ModerationDecision, PinStatus } from "@prisma/client";
import {
  createSafeSearchFailureResult,
  GoogleVisionSafeSearchProvider,
} from "@/lib/moderation/google-vision-safe-search-provider";
import {
  decideSafeSearchModeration,
  pinStatusForModerationDecision,
} from "@/lib/moderation/safe-search-decision";
import type {
  SafeSearchDetectionResult,
  SafeSearchProvider,
} from "@/lib/moderation/safe-search-provider";

export type ImageModerationResult = SafeSearchDetectionResult & {
  decision: ModerationDecision;
  pinStatus: PinStatus;
  failedOpen: boolean;
};

let safeSearchProvider: SafeSearchProvider | null = null;

export async function moderateImageWithSafeSearch(input: {
  image: Buffer;
}): Promise<ImageModerationResult> {
  try {
    const result = await getSafeSearchProvider().detect(input);
    const decision = decideSafeSearchModeration(result);

    return {
      ...result,
      decision,
      pinStatus: pinStatusForModerationDecision(decision),
      failedOpen: false,
    };
  } catch (error) {
    const result = createSafeSearchFailureResult(error);

    return {
      ...result,
      decision: ModerationDecision.HUMAN_REVIEW_REQUIRED,
      pinStatus: PinStatus.PENDING_REVIEW,
      failedOpen: true,
    };
  }
}

function getSafeSearchProvider(): SafeSearchProvider {
  safeSearchProvider ??= new GoogleVisionSafeSearchProvider();
  return safeSearchProvider;
}
