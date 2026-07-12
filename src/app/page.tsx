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
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { getDictionary, t } from "@/lib/i18n/t";
import { getNotificationSummary } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const title = t(dictionary, "meta.homeTitle");
  const description = t(dictionary, "meta.homeDescription");

  return {
    alternates: {
      canonical: "/",
    },
    description,
    openGraph: {
      description,
      title: `${title} | PinFa`,
      type: "website",
      url: "/",
    },
    title,
  };
}

const emptyHomeFeedPage: HomeFeedPage = {
  hasMore: false,
  items: [],
  nextCursor: null,
  organicItems: [],
};

export default async function Home() {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
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
      feedError = t(dictionary, "feed.loadMoreFailed");
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
        locale={locale}
        notificationSummary={notificationSummary}
      />
      <main className="mx-auto grid min-h-screen w-full max-w-[1600px] gap-4 px-2 py-3 sm:px-4 lg:px-6">
        <HomeFeed
          boards={boards}
          initialError={feedError}
          initialPage={initialPage}
          isAuthenticated={Boolean(currentUser)}
          locale={locale}
        />
      </main>
    </>
  );
}
