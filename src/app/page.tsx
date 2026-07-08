import { AppHeader } from "@/components/AppHeader";
import { HomeFeed } from "@/components/feed/HomeFeed";
import type { Metadata } from "next";
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

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
  description:
    "Explore a mobile-first visual feed of published Pins, Boards, and inspiration on PinFa.",
  openGraph: {
    description:
      "Explore a mobile-first visual feed of published Pins, Boards, and inspiration on PinFa.",
    title: "PinFa Home Feed",
    type: "website",
    url: "/",
  },
  title: "Home Feed",
};

const emptyHomeFeedPage: HomeFeedPage = {
  hasMore: false,
  items: [],
  nextCursor: null,
  organicItems: [],
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
  }).catch((error) => {
    logAnalyticsError("home.feed_view_events.failed", error, {
      userId: currentUser?.id ?? null,
    });
  });

  return (
    <>
      <AppHeader
        currentUser={currentUser}
        notificationSummary={notificationSummary}
      />
      <main className="mx-auto grid min-h-screen w-full max-w-[1600px] gap-4 px-2 py-3 sm:px-4 lg:px-6">
        <HomeFeed
          boards={boards}
          initialError={feedError}
          initialPage={initialPage}
          isAuthenticated={Boolean(currentUser)}
        />
      </main>
    </>
  );
}
