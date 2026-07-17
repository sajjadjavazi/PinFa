import { ReportReason, ReportStatus, ReportTargetType } from "@prisma/client";
import Link from "next/link";
import { ReportActionsPanel } from "@/components/admin/ReportActionsPanel";
import { requireAdminPageUser } from "@/lib/admin";
import type { Locale } from "@/lib/i18n/config";
import { formatLocaleNumber } from "@/lib/i18n/format";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import type { Dictionary } from "@/lib/i18n/t";
import { getDictionary, t } from "@/lib/i18n/t";
import {
  getAdminReportStats,
  getAdminReports,
  parseAdminReportFilters,
  type AdminReportListItem,
  type AdminReportTargetPreview,
} from "@/lib/admin-report-queries";

export const dynamic = "force-dynamic";

type AdminReportsPageProps = {
  searchParams: Promise<{
    cursor?: string;
    order?: string;
    reason?: string;
    status?: string;
    targetType?: string;
  }>;
};

export default async function AdminReportsPage({
  searchParams,
}: AdminReportsPageProps) {
  await requireAdminPageUser();
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);

  const params = await searchParams;
  const filters = parseAdminReportFilters(params);
  const [reports, stats] = await Promise.all([
    getAdminReports(filters),
    getAdminReportStats(),
  ]);

  return (
    <div className="grid gap-8">
      <section className="flex flex-col gap-4 border-b border-neutral-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-neutral-500">
            {t(dictionary, "admin.reports.reports")}
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-neutral-950">
            {t(dictionary, "admin.reports.heading")}
          </h1>
        </div>
        <dl className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
          {Object.values(ReportStatus).map((status) => (
            <div
              key={status}
              className="rounded-md bg-white px-4 py-3 shadow-sm ring-1 ring-neutral-200"
            >
              <dt className="text-neutral-500">
                {t(dictionary, `enums.reportStatus.${status}`)}
              </dt>
              <dd className="mt-1 text-2xl font-semibold">
                {formatLocaleNumber(stats[status], locale)}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <form className="grid gap-3 rounded-md bg-white p-4 shadow-sm ring-1 ring-neutral-200 md:grid-cols-5">
        <FilterSelect
          dictionary={dictionary}
          label={t(dictionary, "admin.reports.filters.target")}
          name="targetType"
          options={Object.values(ReportTargetType)}
          value={filters.targetType ?? "ALL"}
        />
        <FilterSelect
          dictionary={dictionary}
          label={t(dictionary, "admin.reports.filters.reason")}
          name="reason"
          options={Object.values(ReportReason)}
          value={filters.reason ?? "ALL"}
        />
        <FilterSelect
          dictionary={dictionary}
          label={t(dictionary, "admin.reports.filters.status")}
          name="status"
          options={Object.values(ReportStatus)}
          value={filters.status ?? "ALL"}
        />
        <FilterSelect
          dictionary={dictionary}
          label={t(dictionary, "admin.reports.filters.order")}
          name="order"
          options={["newest", "oldest"]}
          value={filters.order}
        />
        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="h-10 rounded-md bg-neutral-950 px-4 text-sm font-medium text-white transition hover:bg-neutral-800"
          >
            {t(dictionary, "admin.actions.apply")}
          </button>
          <Link
            href="/admin/reports"
            className="grid h-10 place-items-center rounded-md border border-neutral-300 px-4 text-sm font-medium text-neutral-800 transition hover:border-neutral-950"
          >
            {t(dictionary, "admin.actions.reset")}
          </Link>
        </div>
      </form>

      <section className="grid gap-4">
        <div>
          <h2 className="text-xl font-semibold">{t(dictionary, "admin.reports.reports")}</h2>
          <p className="mt-1 text-sm text-neutral-500">
            {t(dictionary, "admin.reports.showing", {
              count: formatLocaleNumber(reports.items.length, locale),
            })}
          </p>
        </div>

        {reports.items.length > 0 ? (
          <div className="grid gap-4">
            {reports.items.map((report) => (
              <ReportCard
                key={report.id}
                dictionary={dictionary}
                locale={locale}
                report={report}
              />
            ))}
          </div>
        ) : (
          <EmptyState message={t(dictionary, "admin.reports.noMatches")} />
        )}

        {reports.hasMore && reports.nextCursor ? (
          <div>
            <Link
              href={buildNextPageHref(params, reports.nextCursor)}
              className="inline-grid h-10 place-items-center rounded-md border border-neutral-300 px-4 text-sm font-medium text-neutral-800 transition hover:border-neutral-950"
            >
              {t(dictionary, "admin.actions.loadMore")}
            </Link>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function ReportCard({
  dictionary,
  locale,
  report,
}: {
  dictionary: Dictionary;
  locale: Locale;
  report: AdminReportListItem;
}) {
  const canAct =
    report.status === ReportStatus.OPEN || report.status === ReportStatus.IN_REVIEW;

  return (
    <article className="grid gap-5 rounded-md bg-white p-4 shadow-sm ring-1 ring-neutral-200 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="grid gap-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{t(dictionary, `enums.reportStatus.${report.status}`)}</Badge>
          <Badge>{t(dictionary, `enums.targetType.${report.targetType}`)}</Badge>
          <Badge>{t(dictionary, `reportReasons.${report.reason}`)}</Badge>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-neutral-950">
            {t(dictionary, "admin.reports.report")} {" "}
            <span dir="ltr" className="break-all font-mono text-sm">
              #{report.id}
            </span>
          </h3>
          {report.description ? (
            <p dir="auto" className="mt-2 leading-6 text-neutral-600">
              {report.description}
            </p>
          ) : (
            <p className="mt-2 text-sm text-neutral-500">
              {t(dictionary, "admin.reports.descriptionEmpty")}
            </p>
          )}
        </div>

        <dl className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
          <InfoItem label={t(dictionary, "admin.reports.reporter")}>
            <Link
              href={`/users/${report.reporter.username}`}
              className="font-medium text-neutral-950 underline-offset-4 hover:underline"
            >
              {report.reporter.displayName}
            </Link>
            <span className="block text-neutral-500">
              <span dir="ltr">@{report.reporter.username}</span> -{" "}
              {t(dictionary, `enums.userStatus.${report.reporter.status}`)}
            </span>
          </InfoItem>
          <InfoItem label={t(dictionary, "admin.reports.targetId")}>
            <span dir="ltr" className="block break-all font-mono text-xs">
              {report.targetId}
            </span>
          </InfoItem>
          <InfoItem label={t(dictionary, "admin.reports.created")}>
            {new Date(report.createdAt).toLocaleString(locale === "fa" ? "fa-IR" : "en-US")}
          </InfoItem>
          <InfoItem label={t(dictionary, "admin.reports.updated")}>
            {new Date(report.updatedAt).toLocaleString(locale === "fa" ? "fa-IR" : "en-US")}
          </InfoItem>
          <InfoItem label={t(dictionary, "admin.reports.reviewedBy")}>
            {report.reviewedBy ? (
              <>
                {report.reviewedBy.displayName} {" "}
                <span dir="ltr">(@{report.reviewedBy.username})</span>
              </>
            ) : (
              t(dictionary, "admin.reports.notReviewed")
            )}
          </InfoItem>
        </dl>

        {report.reviewNote ? (
          <p className="rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
            {report.reviewNote}
          </p>
        ) : null}

        <TargetPreview
          dictionary={dictionary}
          locale={locale}
          target={report.targetPreview}
        />
      </div>

      <ReportActionsPanel
        canAct={canAct}
        locale={locale}
        reportId={report.id}
        targetType={report.targetType}
      />
    </article>
  );
}

function TargetPreview({
  dictionary,
  locale,
  target,
}: {
  dictionary: Dictionary;
  locale: Locale;
  target: AdminReportTargetPreview | null;
}) {
  if (!target) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        {t(dictionary, "admin.reports.boardNotFound")}
      </div>
    );
  }

  if (target.type === "PIN") {
    return <PinTargetPreview dictionary={dictionary} locale={locale} pin={target} />;
  }

  if (target.type === "USER") {
    return <UserTargetPreview dictionary={dictionary} locale={locale} user={target} />;
  }

  return <BoardTargetPreview board={target} dictionary={dictionary} locale={locale} />;
}

function PinTargetPreview({
  dictionary,
  locale,
  pin,
}: {
  dictionary: Dictionary;
  locale: Locale;
  pin: Extract<AdminReportTargetPreview, { type: "PIN" }>;
}) {
  return (
    <section className="grid gap-4 rounded-md border border-neutral-200 p-3 sm:grid-cols-[160px_minmax(0,1fr)]">
      <ImageBox
        alt={pin.title}
        imageUrl={pin.imageUrl}
        label={t(dictionary, "admin.reports.imageUnavailable")}
      />
      <div className="grid content-start gap-2">
        <div className="flex flex-wrap gap-2">
          <Badge>{t(dictionary, `enums.pinStatus.${pin.status}`)}</Badge>
          {pin.category ? <Badge>{pin.category.name}</Badge> : null}
        </div>
        {pin.publicUrl ? (
          <Link
            href={pin.publicUrl}
            dir="auto"
            className="font-semibold text-neutral-950 underline-offset-4 hover:underline"
          >
            {pin.title}
          </Link>
        ) : (
          <p dir="auto" className="font-semibold text-neutral-950">
            {pin.title}
          </p>
        )}
        <p className="text-sm text-neutral-500">
          {t(dictionary, "search.byOwner", { owner: pin.owner.displayName })} {" "}
          <span dir="ltr">(@{pin.owner.username})</span> -{" "}
          {formatLocaleNumber(pin.reportCount, locale)}{" "}
          {t(dictionary, "admin.reports.reports")}
        </p>
      </div>
    </section>
  );
}

function UserTargetPreview({
  dictionary,
  locale,
  user,
}: {
  dictionary: Dictionary;
  locale: Locale;
  user: Extract<AdminReportTargetPreview, { type: "USER" }>;
}) {
  return (
    <section className="grid gap-4 rounded-md border border-neutral-200 p-3 sm:grid-cols-[72px_minmax(0,1fr)]">
      <ImageBox
        alt={user.displayName}
        imageUrl={user.avatarUrl}
        label={t(dictionary, "admin.reports.noAvatar")}
      />
      <div className="grid content-start gap-2">
        <div className="flex flex-wrap gap-2">
          <Badge>{t(dictionary, `enums.userStatus.${user.status}`)}</Badge>
          <Badge>{t(dictionary, `enums.userRole.${user.role}`)}</Badge>
        </div>
        {user.publicUrl ? (
          <Link
            href={user.publicUrl}
            dir="auto"
            className="font-semibold text-neutral-950 underline-offset-4 hover:underline"
          >
            {user.displayName}
          </Link>
        ) : (
          <p dir="auto" className="font-semibold text-neutral-950">
            {user.displayName}
          </p>
        )}
        <p className="text-sm text-neutral-500">
          <span dir="ltr">@{user.username}</span> -{" "}
          {t(dictionary, "admin.reports.trustScore")}: {formatLocaleNumber(user.trustScore, locale)} -{" "}
          {t(dictionary, "profile.followerCount", {
            count: formatLocaleNumber(user.followerCount, locale),
          })} -{" "}
          {t(dictionary, "profile.followingCount", {
            count: formatLocaleNumber(user.followingCount, locale),
          })}
        </p>
      </div>
    </section>
  );
}

function BoardTargetPreview({
  board,
  dictionary,
  locale,
}: {
  board: Extract<AdminReportTargetPreview, { type: "BOARD" }>;
  dictionary: Dictionary;
  locale: Locale;
}) {
  return (
    <section className="grid gap-4 rounded-md border border-neutral-200 p-3 sm:grid-cols-[160px_minmax(0,1fr)]">
      <ImageBox
        alt={board.title}
        imageUrl={board.imageUrl}
        label={t(dictionary, "admin.reports.noCover")}
      />
      <div className="grid content-start gap-2">
        <div className="flex flex-wrap gap-2">
          <Badge>{t(dictionary, `enums.boardVisibility.${board.visibility}`)}</Badge>
          <Badge>
            {t(dictionary, "board.pinCount", {
              count: formatLocaleNumber(board.pinCount, locale),
            })}
          </Badge>
          <Badge>
            {t(dictionary, "board.followerCount", {
              count: formatLocaleNumber(board.followerCount, locale),
            })}
          </Badge>
        </div>
        {board.publicUrl ? (
          <Link
            href={board.publicUrl}
            dir="auto"
            className="font-semibold text-neutral-950 underline-offset-4 hover:underline"
          >
            {board.title}
          </Link>
        ) : (
          <p dir="auto" className="font-semibold text-neutral-950">
            {board.title}
          </p>
        )}
        {board.description ? (
          <p dir="auto" className="text-sm text-neutral-600">
            {board.description}
          </p>
        ) : null}
        <p className="text-sm text-neutral-500">
          {t(dictionary, "search.byOwner", { owner: board.owner.displayName })} {" "}
          <span dir="ltr">(@{board.owner.username})</span>
        </p>
      </div>
    </section>
  );
}

function ImageBox({
  alt,
  imageUrl,
  label,
}: {
  alt: string;
  imageUrl: string | null;
  label: string;
}) {
  return (
    <div className="overflow-hidden rounded-md bg-neutral-100">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={alt}
          className="aspect-[4/3] h-full w-full object-cover"
        />
      ) : (
        <div className="grid aspect-[4/3] place-items-center px-3 text-center text-sm text-neutral-500">
          {label}
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  dictionary,
  label,
  name,
  options,
  value,
}: {
  dictionary: Dictionary;
  label: string;
  name: string;
  options: string[];
  value: string;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium text-neutral-950">{label}</span>
      <select
        name={name}
        defaultValue={value}
        className="h-10 rounded-md border border-neutral-300 bg-white px-2 text-sm outline-none transition focus:border-neutral-950"
      >
        {name !== "order" ? (
          <option value="ALL">{t(dictionary, "admin.reports.filters.all")}</option>
        ) : null}
        {options.map((option) => (
          <option key={option} value={option}>
            {formatAdminOptionLabel(dictionary, name, option)}
          </option>
        ))}
      </select>
    </label>
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

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-700">
      {children}
    </span>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-md bg-white px-4 py-8 text-center text-sm text-neutral-500 shadow-sm ring-1 ring-neutral-200">
      {message}
    </div>
  );
}

function buildNextPageHref(
  params: Awaited<AdminReportsPageProps["searchParams"]>,
  cursor: string,
) {
  const nextParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value && key !== "cursor") {
      nextParams.set(key, value);
    }
  }

  nextParams.set("cursor", cursor);

  return `/admin/reports?${nextParams.toString()}`;
}

function formatAdminOptionLabel(
  dictionary: Dictionary,
  name: string,
  value: string,
) {
  if (name === "reason") {
    return t(dictionary, `reportReasons.${value}`);
  }

  if (name === "status") {
    return t(dictionary, `enums.reportStatus.${value}`);
  }

  if (name === "targetType") {
    return t(dictionary, `enums.targetType.${value}`);
  }

  if (name === "order") {
    return t(dictionary, `admin.reports.filters.${value}`);
  }

  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
