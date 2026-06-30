import {
  ReportReason,
  ReportStatus,
  ReportTargetType,
  Prisma,
} from "@prisma/client";
import Link from "next/link";
import { ReportActionButton } from "@/components/admin/ReportActionButton";
import { requireAdminPageUser } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type AdminReportsPageProps = {
  searchParams: Promise<{
    reason?: string;
    status?: string;
    targetType?: string;
  }>;
};

const reportSelect = {
  id: true,
  targetType: true,
  targetId: true,
  reason: true,
  description: true,
  status: true,
  reviewNote: true,
  createdAt: true,
  updatedAt: true,
  reporter: {
    select: {
      id: true,
      username: true,
      displayName: true,
      status: true,
    },
  },
  reviewedBy: {
    select: {
      username: true,
      displayName: true,
    },
  },
} satisfies Prisma.ReportSelect;

type AdminReport = Prisma.ReportGetPayload<{
  select: typeof reportSelect;
}>;

type PinTarget = Prisma.PinGetPayload<{
  select: typeof pinTargetSelect;
}>;

type UserTarget = Prisma.UserGetPayload<{
  select: typeof userTargetSelect;
}>;

type BoardTarget = Prisma.BoardGetPayload<{
  select: typeof boardTargetSelect;
}>;

const pinTargetSelect = {
  id: true,
  title: true,
  status: true,
  imageThumbnailUrl: true,
  imageFeedUrl: true,
  imageDetailUrl: true,
  reportCount: true,
  owner: {
    select: {
      username: true,
      displayName: true,
      status: true,
    },
  },
  category: {
    select: {
      name: true,
      slug: true,
    },
  },
} satisfies Prisma.PinSelect;

const userTargetSelect = {
  id: true,
  username: true,
  displayName: true,
  status: true,
  role: true,
  trustScore: true,
  followerCount: true,
} satisfies Prisma.UserSelect;

const boardTargetSelect = {
  id: true,
  title: true,
  description: true,
  visibility: true,
  pinCount: true,
  followerCount: true,
  owner: {
    select: {
      username: true,
      displayName: true,
      status: true,
    },
  },
  coverPin: {
    select: {
      title: true,
      status: true,
      imageThumbnailUrl: true,
      imageFeedUrl: true,
    },
  },
} satisfies Prisma.BoardSelect;

export default async function AdminReportsPage({
  searchParams,
}: AdminReportsPageProps) {
  await requireAdminPageUser();

  const params = await searchParams;
  const filters = parseReportFilters(params);
  const where = buildReportWhere(filters);
  const [reports, openCount, inReviewCount] = await Promise.all([
    prisma.report.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      select: reportSelect,
      take: 100,
    }),
    prisma.report.count({
      where: {
        status: ReportStatus.OPEN,
      },
    }),
    prisma.report.count({
      where: {
        status: ReportStatus.IN_REVIEW,
      },
    }),
  ]);
  const targets = await getReportTargets(reports);

  return (
    <div className="grid gap-8">
      <section className="flex flex-col gap-4 border-b border-neutral-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-neutral-500">Reports</p>
          <h1 className="mt-1 text-3xl font-semibold text-neutral-950">
            Report Management
          </h1>
        </div>
        <dl className="grid grid-cols-2 gap-3 text-sm sm:min-w-72">
          <div className="rounded-md bg-white px-4 py-3 shadow-sm ring-1 ring-neutral-200">
            <dt className="text-neutral-500">Open</dt>
            <dd className="mt-1 text-2xl font-semibold">{openCount}</dd>
          </div>
          <div className="rounded-md bg-white px-4 py-3 shadow-sm ring-1 ring-neutral-200">
            <dt className="text-neutral-500">In Review</dt>
            <dd className="mt-1 text-2xl font-semibold">{inReviewCount}</dd>
          </div>
        </dl>
      </section>

      <form className="grid gap-3 rounded-md bg-white p-4 shadow-sm ring-1 ring-neutral-200 md:grid-cols-4">
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
            Showing {reports.length} reports. The default view is open reports.
          </p>
        </div>

        {reports.length > 0 ? (
          <div className="grid gap-4">
            {reports.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                target={getReportTarget(targets, report)}
              />
            ))}
          </div>
        ) : (
          <EmptyState message="No reports match the selected filters." />
        )}
      </section>
    </div>
  );
}

async function getReportTargets(reports: AdminReport[]) {
  const pinIds = reports
    .filter((report) => report.targetType === ReportTargetType.PIN)
    .map((report) => report.targetId);
  const userIds = reports
    .filter((report) => report.targetType === ReportTargetType.USER)
    .map((report) => report.targetId);
  const boardIds = reports
    .filter((report) => report.targetType === ReportTargetType.BOARD)
    .map((report) => report.targetId);

  const [pins, users, boards] = await Promise.all([
    pinIds.length > 0
      ? prisma.pin.findMany({
          where: {
            id: {
              in: pinIds,
            },
          },
          select: pinTargetSelect,
        })
      : [],
    userIds.length > 0
      ? prisma.user.findMany({
          where: {
            id: {
              in: userIds,
            },
          },
          select: userTargetSelect,
        })
      : [],
    boardIds.length > 0
      ? prisma.board.findMany({
          where: {
            id: {
              in: boardIds,
            },
          },
          select: boardTargetSelect,
        })
      : [],
  ]);

  return {
    boards: new Map(boards.map((board) => [board.id, board])),
    pins: new Map(pins.map((pin) => [pin.id, pin])),
    users: new Map(users.map((user) => [user.id, user])),
  };
}

function ReportCard({
  report,
  target,
}: {
  report: AdminReport;
  target: BoardTarget | PinTarget | UserTarget | null;
}) {
  const canAct =
    report.status === ReportStatus.OPEN || report.status === ReportStatus.IN_REVIEW;

  return (
    <article className="grid gap-5 rounded-md bg-white p-4 shadow-sm ring-1 ring-neutral-200 lg:grid-cols-[minmax(0,1fr)_260px]">
      <div className="grid gap-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{report.status}</Badge>
          <Badge>{report.targetType}</Badge>
          <Badge>{report.reason}</Badge>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-neutral-950">
            Report #{report.id.slice(-8)}
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

        <dl className="grid gap-3 text-sm sm:grid-cols-3">
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
          <InfoItem label="Reported">
            {new Date(report.createdAt).toLocaleString()}
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

        <TargetPreview report={report} target={target} />
      </div>

      <div className="grid content-start gap-3">
        {canAct ? (
          <>
            <ReportActionButton
              action="resolve"
              label="Mark Resolved"
              reportId={report.id}
              tone="primary"
            />
            <ReportActionButton
              action="reject"
              label="Reject Report"
              reportId={report.id}
              tone="neutral"
            />
            {report.targetType === ReportTargetType.PIN ? (
              <ReportActionButton
                action="remove-pin"
                label="Remove Pin"
                reportId={report.id}
                tone="danger"
              />
            ) : null}
            {report.targetType === ReportTargetType.USER ? (
              <ReportActionButton
                action="suspend-user"
                label="Suspend User"
                reportId={report.id}
                tone="danger"
              />
            ) : null}
          </>
        ) : (
          <div className="rounded-md bg-neutral-50 px-3 py-3 text-sm text-neutral-500">
            This report has already been reviewed.
          </div>
        )}
      </div>
    </article>
  );
}

function TargetPreview({
  report,
  target,
}: {
  report: AdminReport;
  target: BoardTarget | PinTarget | UserTarget | null;
}) {
  if (!target) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Target record was not found.
      </div>
    );
  }

  if (report.targetType === ReportTargetType.PIN) {
    return <PinTargetPreview pin={target as PinTarget} />;
  }

  if (report.targetType === ReportTargetType.USER) {
    return <UserTargetPreview user={target as UserTarget} />;
  }

  return <BoardTargetPreview board={target as BoardTarget} />;
}

function PinTargetPreview({ pin }: { pin: PinTarget }) {
  const imageUrl =
    pin.imageThumbnailUrl ?? pin.imageFeedUrl ?? pin.imageDetailUrl ?? null;

  return (
    <section className="grid gap-4 rounded-md border border-neutral-200 p-3 sm:grid-cols-[160px_minmax(0,1fr)]">
      <div className="overflow-hidden rounded-md bg-neutral-100">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={pin.title}
            className="aspect-[4/3] h-full w-full object-cover"
          />
        ) : (
          <div className="grid aspect-[4/3] place-items-center text-sm text-neutral-500">
            Image unavailable
          </div>
        )}
      </div>
      <div className="grid content-start gap-2">
        <div className="flex flex-wrap gap-2">
          <Badge>{pin.status}</Badge>
          {pin.category ? <Badge>{pin.category.name}</Badge> : null}
        </div>
        <Link
          href={`/pins/${pin.id}`}
          className="font-semibold text-neutral-950 underline-offset-4 hover:underline"
        >
          {pin.title}
        </Link>
        <p className="text-sm text-neutral-500">
          by {pin.owner.displayName} (@{pin.owner.username}) - {pin.reportCount}{" "}
          reports
        </p>
      </div>
    </section>
  );
}

function UserTargetPreview({ user }: { user: UserTarget }) {
  return (
    <section className="rounded-md border border-neutral-200 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge>{user.status}</Badge>
        <Badge>{user.role}</Badge>
      </div>
      <Link
        href={`/users/${user.username}`}
        className="mt-2 block font-semibold text-neutral-950 underline-offset-4 hover:underline"
      >
        {user.displayName}
      </Link>
      <p className="text-sm text-neutral-500">
        @{user.username} - trust {user.trustScore} - {user.followerCount} followers
      </p>
    </section>
  );
}

function BoardTargetPreview({ board }: { board: BoardTarget }) {
  const imageUrl =
    board.coverPin?.status === "PUBLISHED"
      ? board.coverPin.imageThumbnailUrl ?? board.coverPin.imageFeedUrl
      : null;

  return (
    <section className="grid gap-4 rounded-md border border-neutral-200 p-3 sm:grid-cols-[160px_minmax(0,1fr)]">
      <div className="overflow-hidden rounded-md bg-neutral-100">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={board.coverPin?.title ?? board.title}
            className="aspect-[4/3] h-full w-full object-cover"
          />
        ) : (
          <div className="grid aspect-[4/3] place-items-center text-sm text-neutral-500">
            No cover
          </div>
        )}
      </div>
      <div>
        <div className="flex flex-wrap gap-2">
          <Badge>{board.visibility}</Badge>
          <Badge>{board.pinCount} Pins</Badge>
        </div>
        <Link
          href={`/boards/${board.id}`}
          className="mt-2 block font-semibold text-neutral-950 underline-offset-4 hover:underline"
        >
          {board.title}
        </Link>
        <p className="text-sm text-neutral-500">
          by {board.owner.displayName} (@{board.owner.username})
        </p>
      </div>
    </section>
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
        <option value="ALL">All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
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

function parseReportFilters(input: {
  reason?: string;
  status?: string;
  targetType?: string;
}) {
  return {
    reason: readEnumValue(input.reason, ReportReason),
    status: readEnumValue(input.status ?? ReportStatus.OPEN, ReportStatus),
    targetType: readEnumValue(input.targetType, ReportTargetType),
  };
}

function buildReportWhere(filters: ReturnType<typeof parseReportFilters>) {
  return {
    ...(filters.reason ? { reason: filters.reason } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.targetType ? { targetType: filters.targetType } : {}),
  } satisfies Prisma.ReportWhereInput;
}

function getReportTarget(
  targets: Awaited<ReturnType<typeof getReportTargets>>,
  report: AdminReport,
) {
  if (report.targetType === ReportTargetType.PIN) {
    return targets.pins.get(report.targetId) ?? null;
  }

  if (report.targetType === ReportTargetType.USER) {
    return targets.users.get(report.targetId) ?? null;
  }

  return targets.boards.get(report.targetId) ?? null;
}

function readEnumValue<T extends Record<string, string>>(
  value: string | undefined,
  values: T,
) {
  if (!value || value === "ALL") {
    return null;
  }

  const enumValues = new Set<string>(Object.values(values));

  return enumValues.has(value) ? (value as T[keyof T]) : null;
}
