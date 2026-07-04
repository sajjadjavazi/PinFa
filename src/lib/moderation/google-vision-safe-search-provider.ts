import { ImageAnnotatorClient } from "@google-cloud/vision";
import { Likelihood, Prisma } from "@prisma/client";
import type {
  SafeSearchDetectionInput,
  SafeSearchDetectionResult,
  SafeSearchProvider,
} from "@/lib/moderation/safe-search-provider";

const providerName = "google_vision_safe_search";

const likelihoodByNumber: Record<number, Likelihood> = {
  0: Likelihood.UNKNOWN,
  1: Likelihood.VERY_UNLIKELY,
  2: Likelihood.UNLIKELY,
  3: Likelihood.POSSIBLE,
  4: Likelihood.LIKELY,
  5: Likelihood.VERY_LIKELY,
};

const likelihoodValues = new Set<string>(Object.values(Likelihood));

type VisionClientOptions = ConstructorParameters<typeof ImageAnnotatorClient>[0];

type ServiceAccountJson = {
  project_id?: string;
  client_email?: string;
  private_key?: string;
};

type ParsedServiceAccount = ServiceAccountJson & {
  client_email: string;
  private_key: string;
};

export class GoogleVisionSafeSearchProvider implements SafeSearchProvider {
  readonly providerName = providerName;

  private readonly client: ImageAnnotatorClient;

  constructor() {
    this.client = new ImageAnnotatorClient(createVisionClientOptions());
  }

  async detect(
    input: SafeSearchDetectionInput,
  ): Promise<SafeSearchDetectionResult> {
    const [response] = await this.client.safeSearchDetection(input.image);
    const annotation = response.safeSearchAnnotation;

    const rawAnnotation = {
      adult: annotation?.adult ?? null,
      racy: annotation?.racy ?? null,
      violence: annotation?.violence ?? null,
      medical: annotation?.medical ?? null,
      spoof: annotation?.spoof ?? null,
    };

    return {
      provider: this.providerName,
      adultLikelihood: normalizeLikelihood(rawAnnotation.adult),
      racyLikelihood: normalizeLikelihood(rawAnnotation.racy),
      violenceLikelihood: normalizeLikelihood(rawAnnotation.violence),
      medicalLikelihood: normalizeLikelihood(rawAnnotation.medical),
      spoofLikelihood: normalizeLikelihood(rawAnnotation.spoof),
      rawResponseJson: {
        provider: this.providerName,
        safeSearchAnnotation: rawAnnotation,
      } satisfies Prisma.InputJsonValue,
    };
  }
}

export function createSafeSearchFailureResult(
  error: unknown,
): SafeSearchDetectionResult {
  return {
    provider: providerName,
    adultLikelihood: Likelihood.UNKNOWN,
    racyLikelihood: Likelihood.UNKNOWN,
    violenceLikelihood: Likelihood.UNKNOWN,
    medicalLikelihood: Likelihood.UNKNOWN,
    spoofLikelihood: Likelihood.UNKNOWN,
    rawResponseJson: {
      provider: providerName,
      error: "SafeSearch request failed.",
      errorType: error instanceof Error ? error.name : typeof error,
      failedOpen: true,
      message: error instanceof Error ? error.message : "Unknown error.",
    } satisfies Prisma.InputJsonValue,
  };
}

function createVisionClientOptions(): VisionClientOptions {
  const jsonCredentials =
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON ??
    process.env.GOOGLE_CLOUD_CREDENTIALS_JSON;
  const projectId =
    process.env.GOOGLE_CLOUD_PROJECT ??
    process.env.GOOGLE_PROJECT_ID ??
    process.env.GOOGLE_VISION_PROJECT_ID;

  if (jsonCredentials) {
    const credentials = parseServiceAccountJson(jsonCredentials);

    return {
      projectId: projectId ?? credentials.project_id,
      credentials: {
        client_email: credentials.client_email,
        private_key: normalizePrivateKey(credentials.private_key),
      },
    };
  }

  const clientEmail =
    process.env.GOOGLE_VISION_CLIENT_EMAIL ?? process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey =
    process.env.GOOGLE_VISION_PRIVATE_KEY ?? process.env.GOOGLE_PRIVATE_KEY;

  if (clientEmail && privateKey) {
    return {
      projectId,
      credentials: {
        client_email: clientEmail,
        private_key: normalizePrivateKey(privateKey),
      },
    };
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return {
      projectId,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    };
  }

  return projectId ? { projectId } : undefined;
}

function parseServiceAccountJson(value: string): ParsedServiceAccount {
  try {
    const credentials = JSON.parse(value) as ServiceAccountJson;

    if (!credentials.client_email || !credentials.private_key) {
      throw new Error("Missing client_email or private_key.");
    }

    return {
      ...credentials,
      client_email: credentials.client_email,
      private_key: credentials.private_key,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error.";
    throw new Error(`Invalid Google service account JSON: ${message}`);
  }
}

function normalizePrivateKey(privateKey: string): string {
  return privateKey.replace(/\\n/g, "\n");
}

function normalizeLikelihood(value: unknown): Likelihood {
  if (typeof value === "number") {
    return likelihoodByNumber[value] ?? Likelihood.UNKNOWN;
  }

  if (typeof value === "string" && likelihoodValues.has(value)) {
    return value as Likelihood;
  }

  return Likelihood.UNKNOWN;
}
