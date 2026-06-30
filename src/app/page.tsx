import Link from "next/link";
import { HomeFeed } from "@/components/feed/HomeFeed";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
import { logAnalyticsError } from "@/lib/analytics";
import { getCurrentUser } from "@/lib/auth";
import {
  getHomeFeedPage,
  recordFeedViewEvents,
  type HomeFeedPage,
} from "@/lib/feed";
import { getNotificationSummary } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const emptyHomeFeedPage: HomeFeedPage = {
  has_more: false,
  items: [],
  next_cursor: null,
};

export default async function Home() {
  let currentUser: Awaited<ReturnType<typeof getCurrentUser>> = null;
  let feedError: string | null = null;

  try {
    currentUser = await getCurrentUser();
  } catch (error) {
    logAnalyticsError("home.current_user.failed", error);
  }

  const [initialPage, boards, notificationSummary] = await Promise.all([
    getHomeFeedPage({
      limit: 24,
      viewerUserId: currentUser?.id,
    }).catch((error) => {
      logAnalyticsError("home.feed_initial.failed", error, {
        userId: currentUser?.id ?? null,
      });
      feedError = "Please check the database connection and try again.";
      return emptyHomeFeedPage;
    }),
    currentUser
      ? prisma.board
          .findMany({
            where: {
              ownerUserId: currentUser.id,
            },
            orderBy: {
              title: "asc",
            },
            select: {
              id: true,
              title: true,
              pinCount: true,
            },
          })
          .catch((error) => {
            logAnalyticsError("home.boards.failed", error, {
              userId: currentUser?.id ?? null,
            });
            return [];
          })
      : [],
    currentUser
      ? getNotificationSummary({
          userId: currentUser.id,
        }).catch((error) => {
          logAnalyticsError("home.notifications.failed", error, {
            userId: currentUser?.id ?? null,
          });
          return null;
        })
      : null,
  ]);

  await recordFeedViewEvents({
    items: initialPage.items,
    userId: currentUser?.id,
  });

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-7xl gap-8 px-5 py-6 sm:px-6 lg:px-8">
      <section className="flex flex-col gap-5 border-b border-neutral-200 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium text-neutral-500">PinFa</p>
          <h1 className="mt-2 text-3xl font-semibold text-neutral-950">
            Home Feed
          </h1>
        </div>
        <nav className="flex flex-wrap gap-3">
          <Link
            href="/search"
            className="grid h-10 place-items-center rounded-md border border-neutral-300 px-4 text-sm font-medium text-neutral-800 transition hover:border-neutral-950"
          >
            Search
          </Link>
          {currentUser ? (
            <>
              {notificationSummary ? (
                <NotificationDropdown
                  initialNotifications={notificationSummary.recentNotifications}
                  initialUnreadCount={notificationSummary.unreadCount}
                />
              ) : null}
              <Link
                href="/upload"
                className="grid h-10 place-items-center rounded-md bg-neutral-950 px-4 text-sm font-medium text-white transition hover:bg-neutral-800"
              >
                Upload
              </Link>
              <Link
                href="/profile"
                className="grid h-10 place-items-center rounded-md border border-neutral-300 px-4 text-sm font-medium text-neutral-800 transition hover:border-neutral-950"
              >
                Profile
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="grid h-10 place-items-center rounded-md border border-neutral-300 px-4 text-sm font-medium text-neutral-800 transition hover:border-neutral-950"
              >
                Log in
              </Link>
              <Link
                href="/auth/register"
                className="grid h-10 place-items-center rounded-md bg-neutral-950 px-4 text-sm font-medium text-white transition hover:bg-neutral-800"
              >
                Register
              </Link>
            </>
          )}
        </nav>
      </section>

      <HomeFeed
        boards={boards}
        initialError={feedError}
        initialPage={initialPage}
        isAuthenticated={Boolean(currentUser)}
      />
    </main>
  );
}
