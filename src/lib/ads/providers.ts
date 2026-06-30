import { AdProvider as PrismaAdProvider } from "@prisma/client";
import type { AdProvider } from "@/lib/ads/ad-provider";
import { YektanetAdProvider } from "@/lib/ads/yektanet-ad-provider";

const yektanetProvider = new YektanetAdProvider();

export function getAdProvider(provider: PrismaAdProvider): AdProvider | null {
  if (provider === PrismaAdProvider.YEKTANET) {
    return yektanetProvider;
  }

  return null;
}
