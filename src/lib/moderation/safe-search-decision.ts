import { Likelihood, ModerationDecision, PinStatus } from "@prisma/client";
import type { SafeSearchLikelihoods } from "@/lib/moderation/safe-search-provider";

const unsafeLikelihoods = new Set<Likelihood>([
  Likelihood.LIKELY,
  Likelihood.VERY_LIKELY,
]);

const safeLikelihoods = new Set<Likelihood>([
  Likelihood.VERY_UNLIKELY,
  Likelihood.UNLIKELY,
]);

const criticalLikelihoodFields = [
  "adultLikelihood",
  "racyLikelihood",
  "violenceLikelihood",
  "medicalLikelihood",
] satisfies Array<keyof SafeSearchLikelihoods>;

export function decideSafeSearchModeration(
  result: SafeSearchLikelihoods,
): ModerationDecision {
  if (
    unsafeLikelihoods.has(result.adultLikelihood) ||
    unsafeLikelihoods.has(result.racyLikelihood) ||
    unsafeLikelihoods.has(result.violenceLikelihood)
  ) {
    return ModerationDecision.AUTO_REJECTED;
  }

  if (unsafeLikelihoods.has(result.medicalLikelihood)) {
    return ModerationDecision.HUMAN_REVIEW_REQUIRED;
  }

  if (
    result.adultLikelihood === Likelihood.POSSIBLE ||
    result.racyLikelihood === Likelihood.POSSIBLE ||
    result.violenceLikelihood === Likelihood.POSSIBLE ||
    result.medicalLikelihood === Likelihood.POSSIBLE
  ) {
    return ModerationDecision.HUMAN_REVIEW_REQUIRED;
  }

  if (
    criticalLikelihoodFields.some((field) => result[field] === Likelihood.UNKNOWN)
  ) {
    return ModerationDecision.HUMAN_REVIEW_REQUIRED;
  }

  if (
    criticalLikelihoodFields.every((field) => safeLikelihoods.has(result[field]))
  ) {
    return ModerationDecision.AUTO_APPROVED;
  }

  return ModerationDecision.HUMAN_REVIEW_REQUIRED;
}

export function pinStatusForModerationDecision(
  decision: ModerationDecision,
): PinStatus {
  switch (decision) {
    case ModerationDecision.AUTO_APPROVED:
      return PinStatus.PUBLISHED;
    case ModerationDecision.AUTO_REJECTED:
      return PinStatus.REJECTED;
    default:
      return PinStatus.PENDING_REVIEW;
  }
}
