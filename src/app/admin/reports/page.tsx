import { ReportReason, ReportStatus, ReportTargetType } from "@prisma/client";
import Link from "next/link";
import { ReportActionsPanel } from "@/components/admin/ReportActionsPanel";
import { requireAdminPageUser } from "@/lib/admin";
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
          <p className="text-sm font-medium text-neutral-500">Reports</p>
          <h1 className="mt-1 text-3xl font-semibold text-neutral-950">
            Report Management
          </h1>
        </div>
        <dl className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
          {Object.values(ReportStatus).map((status) => (
            <div
              key={status}
              className="rounded-md bg-white px-4 py-3 shadow-sm ring-1 ring-neutral-200"
            >
              <dt className="text-neutral-500">{formatEnumLabel(status)}</dt>
              <dd className="mt-1 text-2xl font-semibold">{stats[status]}</dd>
            </div>
          ))}
        </dl>
      </section>

      <form className="grid gap-3 rounded-md bg-white p-4 shadow-sm ring-1 ring-neutral-200 md:grid-cols-5">
        <FilterSelect
          label="Target"
          name="targetType"
          options={Object.values(ReportTargetType)}
          value={filters.targetType ?? "ALL"}
        />
        <FilterSelect
          label="Reason"
          name="reason"
          options={Object.values(ReportReason)}
          value={filters.reason ?? "ALL"}
        />
        <FilterSelect
          label="Status"
          name="status"
          options={Object.values(ReportStatus)}
          value={filters.status ?? "ALL"}
        />
        <FilterSelect
          label="Order"
          name="order"
          options={["newest", "oldest"]}
          value={filters.order}
        />
        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="h-10 rounded-md bg-neutral-950 px-4 text-sm font-medium text-white transition hover:bg-neutral-800"
          >
            Apply
          </button>
          <Link
            href="/admin/reports"
            className="grid h-10 place-items-center rounded-md border border-neutral-300 px-4 text-sm font-medium text-neutral-800 transition hover:border-neutral-950"
          >
            Reset
          </Link>
        </div>
      </form>

      <section className="grid gap-4">
        <div>
          <h2 className="text-xl font-semibold">Reports</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Showing {reports.items.length} reports. Open reports are prioritized
            when no status filter is selected.
          </p>
        </div>

        {reports.items.length > 0 ? (
          <div className="grid gap-4">
            {reports.items.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        ) : (
          <EmptyState message="No reports match the selected filters." />
        )}

        {reports.hasMore && reports.nextCursor ? (
          <div>
            <Link
              href={buildNextPageHref(params, reports.nextCursor)}
              className="inline-grid h-10 place-items-center rounded-md border border-neutral-300 px-4 text-sm font-medium text-neutral-800 transition hover:border-neutral-950"
            >
              Load More
            </Link>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function ReportCard({ report }: { report: AdminReportListItem }) {
  const canAct =
    report.status === ReportStatus.OPEN || report.status === ReportStatus.IN_REVIEW;

  return (
    <article className="grid gap-5 rounded-md bg-white p-4 shadow-sm ring-1 ring-neutral-200 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="grid gap-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{report.status}</Badge>
          <Badge>{report.targetType}</Badge>
          <Badge>{report.reason}</Badge>
        </div>

        <div>
          <h3 className="break-all text-lg font-semibold text-neutral-950">
            Report #{report.id}
          </h3>
          {report.description ? (
            <p className="mt-2 leading-6 text-neutral-600">
              {report.description}
            </p>
          ) : (
            <p className="mt-2 text-sm text-neutral-500">
              No reporter description.
            </p>
          )}
        </div>

        <dl className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
          <InfoItem label="Reporter">
            <Link
              href={`/users/${report.reporter.username}`}
              className="font-medium text-neutral-950 underline-offset-4 hover:underline"
            >
              {report.reporter.displayName}
            </Link>
            <span className="block text-neutral-500">
              @{report.reporter.username} - {report.reporter.status}
            </span>
          </InfoItem>
          <InfoItem label="Target ID">
            <span className="break-all">{report.targetId}</span>
          </InfoItem>
          <InfoItem label="Created">
            {new Date(report.createdAt).toLocaleString()}
          </InfoItem>
          <InfoItem label="Updated">
            {new Date(report.updatedAt).toLocaleString()}
          </InfoItem>
          <InfoItem label="Reviewed By">
            {report.reviewedBy
              ? `${report.reviewedBy.displayName} (@${report.reviewedBy.username})`
              : "Not reviewed"}
          </InfoItem>
        </dl>

        {report.reviewNote ? (
          <p className="rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
            {report.reviewNote}
          </p>
        ) : null}

        <TargetPreview target={report.targetPreview} />
      </div>

      <ReportActionsPanel
        canAct={canAct}
        reportId={report.id}
        targetType={report.targetType}
      />
    </article>
  );
}

function TargetPreview({
  target,
}: {
  target: AdminReportTargetPreview | null;
}) {
  if (!target) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Target not found or no longer available.
      </div>
    );
  }

  if (target.type === "PIN") {
    return <PinTargetPreview pin={target} />;
  }

  if (target.type === "USER") {
    return <UserTargetPreview user={target} />;
  }

  return <BoardTargetPreview board={target} />;
}

function PinTargetPreview({
  pin,
}: {
  pin: Extract<AdminReportTargetPreview, { type: "PIN" }>;
}) {
  return (
    <section className="grid gap-4 rounded-md border border-neutral-200 p-3 sm:grid-cols-[160px_minmax(0,1fr)]">
      <ImageBox alt={pin.title} imageUrl={pin.imageUrl} label="Image unavailable" />
      <div className="grid content-start gap-2">
        <div className="flex flex-wrap gap-2">
          <Badge>{pin.status}</Badge>
          {pin.category ? <Badge>{pin.category.name}</Badge> : null}
        </div>
        {pin.publicUrl ? (
          <Link
            href={pin.publicUrl}
            className="font-semibold text-neutral-950 underline-offset-4 hover:underline"
          >
            {pin.title}
          </Link>
        ) : (
          <p className="font-semibold text-neutral-950">{pin.title}</p>
        )}
        <p className="text-sm text-neutral-500">
          by {pin.owner.displayName} (@{pin.owner.username}) - {pin.reportCount}{" "}
          reports
        </p>
      </div>
    </section>
  );
}

function UserTargetPreview({
  user,
}: {
  user: Extract<AdminReportTargetPreview, { type: "USER" }>;
}) {
  return (
    <section className="grid gap-4 rounded-md border border-neutral-200 p-3 sm:grid-cols-[72px_minmax(0,1fr)]">
      <ImageBox alt={user.displayName} imageUrl={user.avatarUrl} label="No avatar" />
      <div className="grid content-start gap-2">
        <div className="flex flex-wrap gap-2">
          <Badge>{user.status}</Badge>
          <Badge>{user.role}</Badge>
        </div>
        {user.publicUrl ? (
          <Link
            href={user.publicUrl}
            className="font-semibold text-neutral-950 underline-offset-4 hover:underline"
          >
            {user.displayName}
          </Link>
        ) : (
          <p className="font-semibold text-neutral-950">{user.displayName}</p>
        )}
        <p className="text-sm text-neutral-500">
          @{user.username} - trust {user.trustScore} - {user.followerCount}{" "}
          followers - {user.followingCount} following
        </p>
      </div>
    </section>
  );
}

function BoardTargetPreview({
  board,
}: {
  board: Extract<AdminReportTargetPreview, { type: "BOARD" }>;
}) {
  return (
    <section className="grid gap-4 rounded-md border border-neutral-200 p-3 sm:grid-cols-[160px_minmax(0,1fr)]">
      <ImageBox alt={board.title} imageUrl={board.imageUrl} label="No cover" />
      <div className="grid content-start gap-2">
        <div className="flex flex-wrap gap-2">
          <Badge>{board.visibility}</Badge>
          <Badge>{board.pinCount} Pins</Badge>
          <Badge>{board.followerCount} Followers</Badge>
        </div>
        {board.publicUrl ? (
          <Link
            href={board.publicUrl}
            className="font-semibold text-neutral-950 underline-offset-4 hover:underline"
          >
            {board.title}
          </Link>
        ) : (
          <p className="font-semibold text-neutral-950">{board.title}</p>
        )}
        {board.description ? (
          <p className="text-sm text-neutral-600">{board.description}</p>
        ) : null}
        <p className="text-sm text-neutral-500">
          by {board.owner.displayName} (@{board.owner.username})
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
  label,
  name,
  options,
  value,
}: {
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
        {name !== "order" ? <option value="ALL">All</option> : null}
        {options.map((option) => (
          <option key={option} value={option}>
            {formatEnumLabel(option)}
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

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
