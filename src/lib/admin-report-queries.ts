import {
  BoardVisibility,
  PinStatus,
  Prisma,
  ReportReason,
  ReportStatus,
  ReportTargetType,
  UserStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const ADMIN_REPORT_PAGE_SIZE = 50;

export const adminReportSelect = {
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
      id: true,
      username: true,
      displayName: true,
    },
  },
} satisfies Prisma.ReportSelect;

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
  avatarUrl: true,
  status: true,
  role: true,
  trustScore: true,
  followerCount: true,
  followingCount: true,
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

export type AdminReport = Prisma.ReportGetPayload<{
  select: typeof adminReportSelect;
}>;

export type AdminReportOrder = "newest" | "oldest";

export type AdminReportFilters = {
  cursor?: string | null;
  limit: number;
  order: AdminReportOrder;
  reason: ReportReason | null;
  status: ReportStatus | null;
  targetType: ReportTargetType | null;
};

export type AdminReportTargetPreview =
  | {
      type: "PIN";
      id: string;
      title: string;
      status: PinStatus;
      imageUrl: string | null;
      reportCount: number;
      publicUrl: string | null;
      owner: {
        username: string;
        displayName: string;
        status: UserStatus;
      };
      category: {
        name: string;
        slug: string;
      } | null;
    }
  | {
      type: "USER";
      id: string;
      username: string;
      displayName: string;
      avatarUrl: string | null;
      status: UserStatus;
      role: string;
      trustScore: number;
      followerCount: number;
      followingCount: number;
      publicUrl: string | null;
    }
  | {
      type: "BOARD";
      id: string;
      title: string;
      description: string | null;
      visibility: BoardVisibility;
      pinCount: number;
      followerCount: number;
      imageUrl: string | null;
      publicUrl: string | null;
      owner: {
        username: string;
        displayName: string;
        status: UserStatus;
      };
    };

export type AdminReportListItem = AdminReport & {
  targetMissing: boolean;
  targetPreview: AdminReportTargetPreview | null;
};

export type AdminReportStats = Record<ReportStatus, number>;

export async function getAdminReports(input: AdminReportFilters) {
  const limit = clampReportLimit(input.limit);
  const sort = input.order === "oldest" ? "asc" : "desc";
  const reports = await prisma.report.findMany({
    where: buildReportWhere(input),
    orderBy: input.status
      ? [
          {
            createdAt: sort,
          },
          {
            id: sort,
          },
        ]
      : [
          {
            status: "asc",
          },
          {
            createdAt: sort,
          },
          {
            id: sort,
          },
        ],
    cursor: input.cursor ? { id: input.cursor } : undefined,
    skip: input.cursor ? 1 : 0,
    select: adminReportSelect,
    take: limit + 1,
  });
  const hasMore = reports.length > limit;
  const pageReports = hasMore ? reports.slice(0, limit) : reports;
  const targets = await getReportTargets(pageReports);

  return {
    hasMore,
    items: pageReports.map((report) => attachTargetPreview(report, targets)),
    nextCursor: hasMore ? pageReports.at(-1)?.id ?? null : null,
  };
}

export async function getAdminReportById(reportId: string) {
  const report = await prisma.report.findUnique({
    where: {
      id: reportId,
    },
    select: adminReportSelect,
  });

  if (!report) {
    return null;
  }

  const targets = await getReportTargets([report]);

  return attachTargetPreview(report, targets);
}

export async function getAdminReportStats(): Promise<AdminReportStats> {
  const groupedReports = await prisma.report.groupBy({
    by: ["status"],
    _count: {
      _all: true,
    },
  });
  const stats = {
    [ReportStatus.OPEN]: 0,
    [ReportStatus.IN_REVIEW]: 0,
    [ReportStatus.RESOLVED]: 0,
    [ReportStatus.REJECTED]: 0,
  };

  for (const group of groupedReports) {
    stats[group.status] = group._count._all;
  }

  return stats;
}

export function parseAdminReportFilters(input: {
  cursor?: string | null;
  limit?: string | null;
  order?: string | null;
  reason?: string | null;
  status?: string | null;
  targetType?: string | null;
}): AdminReportFilters {
  return {
    cursor: input.cursor ?? null,
    limit: readLimit(input.limit),
    order: input.order === "oldest" ? "oldest" : "newest",
    reason: readEnumValue(input.reason, ReportReason),
    status: readEnumValue(input.status, ReportStatus),
    targetType: readEnumValue(input.targetType, ReportTargetType),
  };
}

export function validateAdminReportFilterInput(input: {
  cursor?: string | null;
  limit?: string | null;
  order?: string | null;
  reason?: string | null;
  status?: string | null;
  targetType?: string | null;
}):
  | {
      ok: true;
      filters: AdminReportFilters;
    }
  | {
      ok: false;
      errors: Record<string, string>;
    } {
  const errors: Record<string, string> = {};
  const filters = parseAdminReportFilters(input);

  if (input.status && input.status !== "ALL" && !filters.status) {
    errors.status = "Report status is invalid.";
  }

  if (input.targetType && input.targetType !== "ALL" && !filters.targetType) {
    errors.targetType = "Report target type is invalid.";
  }

  if (input.reason && input.reason !== "ALL" && !filters.reason) {
    errors.reason = "Report reason is invalid.";
  }

  if (input.order && input.order !== "newest" && input.order !== "oldest") {
    errors.order = "Order must be newest or oldest.";
  }

  if (input.limit && filters.limit === 0) {
    errors.limit = `Limit must be a number from 1 to ${ADMIN_REPORT_PAGE_SIZE}.`;
  }

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      errors,
    };
  }

  return {
    ok: true,
    filters,
  };
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

function attachTargetPreview(
  report: AdminReport,
  targets: Awaited<ReturnType<typeof getReportTargets>>,
): AdminReportListItem {
  const targetPreview = getTargetPreview(report, targets);

  return {
    ...report,
    targetMissing: !targetPreview,
    targetPreview,
  };
}

function getTargetPreview(
  report: AdminReport,
  targets: Awaited<ReturnType<typeof getReportTargets>>,
): AdminReportTargetPreview | null {
  if (report.targetType === ReportTargetType.PIN) {
    const pin = targets.pins.get(report.targetId);

    if (!pin) {
      return null;
    }

    return {
      type: "PIN",
      id: pin.id,
      title: pin.title,
      status: pin.status,
      imageUrl: pin.imageFeedUrl ?? pin.imageThumbnailUrl ?? pin.imageDetailUrl,
      reportCount: pin.reportCount,
      publicUrl: pin.status === PinStatus.PUBLISHED ? `/pins/${pin.id}` : null,
      owner: pin.owner,
      category: pin.category,
    };
  }

  if (report.targetType === ReportTargetType.USER) {
    const user = targets.users.get(report.targetId);

    if (!user) {
      return null;
    }

    return {
      type: "USER",
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      status: user.status,
      role: user.role,
      trustScore: user.trustScore,
      followerCount: user.followerCount,
      followingCount: user.followingCount,
      publicUrl:
        user.status === UserStatus.ACTIVE ? `/users/${user.username}` : null,
    };
  }

  const board = targets.boards.get(report.targetId);

  if (!board) {
    return null;
  }

  return {
    type: "BOARD",
    id: board.id,
    title: board.title,
    description: board.description,
    visibility: board.visibility,
    pinCount: board.pinCount,
    followerCount: board.followerCount,
    imageUrl:
      board.coverPin?.status === PinStatus.PUBLISHED
        ? board.coverPin.imageFeedUrl ?? board.coverPin.imageThumbnailUrl
        : null,
    publicUrl:
      board.visibility === BoardVisibility.PUBLIC ? `/boards/${board.id}` : null,
    owner: board.owner,
  };
}

function buildReportWhere(filters: AdminReportFilters) {
  return {
    ...(filters.reason ? { reason: filters.reason } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.targetType ? { targetType: filters.targetType } : {}),
  } satisfies Prisma.ReportWhereInput;
}

function readEnumValue<T extends Record<string, string>>(
  value: string | null | undefined,
  values: T,
) {
  if (!value || value === "ALL") {
    return null;
  }

  const enumValues = new Set<string>(Object.values(values));

  return enumValues.has(value) ? (value as T[keyof T]) : null;
}

function readLimit(value: string | null | undefined) {
  if (!value) {
    return ADMIN_REPORT_PAGE_SIZE;
  }

  const limit = Number(value);

  if (!Number.isInteger(limit) || limit < 1 || limit > ADMIN_REPORT_PAGE_SIZE) {
    return 0;
  }

  return limit;
}

function clampReportLimit(limit: number) {
  return Math.min(Math.max(limit, 1), ADMIN_REPORT_PAGE_SIZE);
}
