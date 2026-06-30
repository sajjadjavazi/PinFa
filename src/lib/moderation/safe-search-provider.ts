import type { Likelihood, Prisma } from "@prisma/client";

export type SafeSearchLikelihoods = {
  adultLikelihood: Likelihood;
  racyLikelihood: Likelihood;
  violenceLikelihood: Likelihood;
  medicalLikelihood: Likelihood;
  spoofLikelihood: Likelihood;
};

export type SafeSearchDetectionResult = SafeSearchLikelihoods & {
  provider: string;
  rawResponseJson: Prisma.InputJsonValue;
};

export type SafeSearchDetectionInput = {
  image: Buffer;
};

export interface SafeSearchProvider {
  readonly providerName: string;
  detect(input: SafeSearchDetectionInput): Promise<SafeSearchDetectionResult>;
}
