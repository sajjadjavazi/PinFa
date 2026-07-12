import Link from "next/link";
import { ModerationActionPanel } from "@/components/admin/ModerationActionButton";
import { requireAdminPageUser } from "@/lib/admin";
import type { Locale } from "@/lib/i18n/config";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import type { Dictionary } from "@/lib/i18n/t";
import { getDictionary, t } from "@/lib/i18n/t";
import {
  getPendingModerationPins,
  getRecentlyPublishedModerationPins,
  type ModerationPin,
} from "@/lib/moderation/admin-moderation-queries";

export const dynamic = "force-dynamic";

type AdminModerationPageProps = {
  searchParams?: Promise<{
    cursor?: string;
  }>;
};

export default async function AdminModerationPage({
  searchParams,
}: AdminModerationPageProps) {
  await requireAdminPageUser();
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);

  const resolvedSearchParams = await searchParams;
  const [pendingQueue, publishedPins] = await Promise.all([
    getPendingModerationPins({
      cursor: resolvedSearchParams?.cursor,
    }),
    getRecentlyPublishedModerationPins(20),
  ]);
  const pendingPins = pendingQueue.items;

  return (
    <div className="grid gap-8">
      <section className="flex flex-col gap-4 border-b border-neutral-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-neutral-500">
            {t(dictionary, "admin.moderation.moderation")}
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-neutral-950">
            {t(dictionary, "admin.moderation.reviewQueue")}
          </h1>
        </div>
        <dl className="grid grid-cols-2 gap-3 text-sm sm:min-w-72">
          <div className="rounded-md bg-white px-4 py-3 shadow-sm ring-1 ring-neutral-200">
            <dt className="text-neutral-500">{t(dictionary, "admin.moderation.pending")}</dt>
            <dd className="mt-1 text-2xl font-semibold">{pendingPins.length}</dd>
          </div>
          <div className="rounded-md bg-white px-4 py-3 shadow-sm ring-1 ring-neutral-200">
            <dt className="text-neutral-500">{t(dictionary, "admin.moderation.published")}</dt>
            <dd className="mt-1 text-2xl font-semibold">{publishedPins.length}</dd>
          </div>
        </dl>
      </section>

      <section className="grid gap-4">
        <div>
          <h2 className="text-xl font-semibold">{t(dictionary, "admin.moderation.pendingReview")}</h2>
          <p className="mt-1 text-sm text-neutral-500">
            {t(dictionary, "admin.moderation.pendingReviewDescription")}
          </p>
        </div>

        {pendingPins.length > 0 ? (
          <div className="grid gap-4">
            {pendingPins.map((pin) => (
              <ModerationPinCard
                key={pin.id}
                dictionary={dictionary}
                locale={locale}
                mode="pending"
                pin={pin}
              />
            ))}
            {pendingQueue.hasMore ? (
              <div>
                <Link
                  href={`/admin/moderation?cursor=${pendingQueue.nextCursor}`}
                  className="inline-grid h-10 place-items-center rounded-md border border-neutral-300 px-4 text-sm font-medium text-neutral-800 transition hover:border-neutral-950"
                >
                  {t(dictionary, "admin.actions.loadMore")}
                </Link>
              </div>
            ) : null}
          </div>
        ) : (
          <EmptyState message={t(dictionary, "admin.moderation.emptyPending")} />
        )}
      </section>

      <section className="grid gap-4 border-t border-neutral-200 pt-8">
        <div>
          <h2 className="text-xl font-semibold">{t(dictionary, "admin.moderation.publishedPins")}</h2>
          <p className="mt-1 text-sm text-neutral-500">
            {t(dictionary, "admin.moderation.publishedPinsDescription")}
          </p>
        </div>

        {publishedPins.length > 0 ? (
          <div className="grid gap-4">
            {publishedPins.map((pin) => (
              <ModerationPinCard
                key={pin.id}
                dictionary={dictionary}
                locale={locale}
                mode="published"
                pin={pin}
              />
            ))}
          </div>
        ) : (
          <EmptyState message={t(dictionary, "admin.moderation.emptyPublished")} />
        )}
      </section>
    </div>
  );
}

function ModerationPinCard({
  dictionary,
  locale,
  mode,
  pin,
}: {
  dictionary: Dictionary;
  locale: Locale;
  mode: "pending" | "published";
  pin: ModerationPin;
}) {
  const moderationResult = pin.moderationResults[0] ?? null;
  const imageUrl = pin.imageThumbnailUrl ?? pin.imageFeedUrl ?? pin.imageDetailUrl;

  return (
    <article className="grid gap-5 rounded-md bg-white p-4 shadow-sm ring-1 ring-neutral-200 lg:grid-cols-[220px_minmax(0,1fr)_240px]">
      <div className="overflow-hidden rounded-md bg-neutral-100">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={pin.title}
            className="aspect-[4/3] h-full w-full object-cover"
          />
        ) : (
          <div className="grid aspect-[4/3] place-items-center text-sm text-neutral-500">
            {t(dictionary, "admin.moderation.imageUnavailable")}
          </div>
        )}
      </div>

      <div className="grid content-start gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-700">
              {t(dictionary, `enums.pinStatus.${pin.status}`)}
            </span>
            {pin.category ? (
              <span className="rounded-md bg-sky-50 px-2 py-1 text-xs font-medium text-sky-800">
                {pin.category.name}
              </span>
            ) : (
              <span className="rounded-md bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-600">
                {t(dictionary, "common.uncategorized")}
              </span>
            )}
            {pin.category?.isSensitive ? (
              <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">
                {t(dictionary, "admin.moderation.sensitive")}
              </span>
            ) : null}
          </div>
          <h3 className="mt-3 text-lg font-semibold text-neutral-950">
            {pin.title}
          </h3>
          {pin.description ? (
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-neutral-600">
              {pin.description}
            </p>
          ) : null}
        </div>

        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <InfoItem label={t(dictionary, "admin.moderation.pinId")}>
            <span className="break-all font-mono text-xs">{pin.id}</span>
          </InfoItem>
          <InfoItem label={t(dictionary, "admin.moderation.created")}>
            {formatDate(pin.createdAt, locale)}
          </InfoItem>
          <InfoItem label={t(dictionary, "admin.moderation.uploader")}>
            <Link
              href={`/users/${pin.owner.username}`}
              className="font-medium text-neutral-950 underline-offset-4 hover:underline"
            >
              {pin.owner.displayName}
            </Link>
            <span className="block text-neutral-500">@{pin.owner.username}</span>
          </InfoItem>
          <InfoItem label={t(dictionary, "admin.moderation.category")}>
            {pin.category?.name ?? t(dictionary, "common.uncategorized")}
          </InfoItem>
          <InfoItem label={t(dictionary, "admin.moderation.currentStatus")}>
            {t(dictionary, `enums.pinStatus.${pin.status}`)}
          </InfoItem>
          <InfoItem label={t(dictionary, "admin.moderation.reports")}>{pin.reportCount}</InfoItem>
          <InfoItem label={t(dictionary, "admin.moderation.size")}>
            {pin.width && pin.height ? `${pin.width} x ${pin.height}` : t(dictionary, "common.unknown")}
          </InfoItem>
        </dl>

        <section>
          <p className="text-sm font-medium text-neutral-950">
            {t(dictionary, "admin.moderation.safeSearch")}
          </p>
          {moderationResult ? (
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
              <LikelihoodValue label="Adult" value={moderationResult.adultLikelihood} />
              <LikelihoodValue label="Racy" value={moderationResult.racyLikelihood} />
              <LikelihoodValue
                label="Violence"
                value={moderationResult.violenceLikelihood}
              />
              <LikelihoodValue
                label="Medical"
                value={moderationResult.medicalLikelihood}
              />
              <LikelihoodValue label="Spoof" value={moderationResult.spoofLikelihood} />
            </div>
          ) : (
            <p className="mt-2 text-sm text-neutral-500">
              {t(dictionary, "admin.moderation.noSafeSearch")}
            </p>
          )}
          {moderationResult ? (
            <p className="mt-2 text-xs text-neutral-500">
              {moderationResult.provider} -{" "}
              {t(dictionary, `enums.moderationDecision.${moderationResult.decision}`)}
              {moderationResult.reviewedBy ? (
                <>
                  {" "}
                  -{" "}
                  {t(dictionary, "admin.moderation.reviewedBy", {
                    name: moderationResult.reviewedBy.displayName,
                  })}
                </>
              ) : null}
            </p>
          ) : null}
        </section>
      </div>

      <ModerationActionPanel locale={locale} mode={mode} pinId={pin.id} />
    </article>
  );
}

function InfoItem({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <div>
      <dt className="font-medium text-neutral-950">{label}</dt>
      <dd className="mt-1 text-neutral-600">{children}</dd>
    </div>
  );
}

function LikelihoodValue({ label, value }: { label: string; value: string }) {
  return (
    <div className={`rounded-md px-2 py-2 ${likelihoodClasses(value)}`}>
      <span className="block font-medium">{label}</span>
      <span className="mt-1 block break-words">{value}</span>
    </div>
  );
}

function likelihoodClasses(value: string) {
  if (value === "LIKELY" || value === "VERY_LIKELY") {
    return "bg-red-50 text-red-800";
  }

  if (value === "POSSIBLE" || value === "UNKNOWN") {
    return "bg-amber-50 text-amber-800";
  }

  return "bg-emerald-50 text-emerald-800";
}

function formatDate(date: Date, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "fa" ? "fa-IR" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-md bg-white px-4 py-8 text-center text-sm text-neutral-500 shadow-sm ring-1 ring-neutral-200">
      {message}
    </div>
  );
}
