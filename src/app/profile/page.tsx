import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { BoardCard } from "@/components/boards/BoardCard";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { ProfileEditForm } from "@/components/ProfileEditForm";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { getDictionary, t } from "@/lib/i18n/t";
import { getNotificationSummary } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);

  return {
    robots: {
      follow: false,
      index: false,
    },
    title: t(dictionary, "profile.title"),
  };
}

export default async function ProfilePage() {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  const [interests, boards, notificationSummary] = await Promise.all([
    prisma.userInterest.findMany({
      where: {
        userId: user.id,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: {
        category: {
          name: "asc",
        },
      },
    }),
    prisma.board.findMany({
      where: {
        ownerUserId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        title: true,
        description: true,
        pinCount: true,
        followerCount: true,
        coverPin: {
          select: {
            title: true,
            imageThumbnailUrl: true,
            imageFeedUrl: true,
            imageDetailUrl: true,
            width: true,
            height: true,
          },
        },
      },
    }),
    getNotificationSummary({
      userId: user.id,
    }),
  ]);

  return (
    <>
    <AppHeader currentUser={user} locale={locale} notificationSummary={notificationSummary} />
    <main className="mx-auto grid min-h-screen w-full max-w-5xl gap-10 px-4 py-8 sm:px-6 lg:px-8">
      <section className="flex flex-col gap-6 border-b border-neutral-200 pb-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-5">
          <ProfileAvatar avatarUrl={user.avatarUrl} displayName={user.displayName} />
          <div>
            <p className="text-sm text-neutral-500">@{user.username}</p>
            <h1 className="mt-1 text-3xl font-semibold text-neutral-950">
              {user.displayName}
            </h1>
            <div className="mt-3 flex gap-4 text-sm text-neutral-600">
              <span>{t(dictionary, "profile.followerCount", { count: user.followerCount })}</span>
              <span>{t(dictionary, "profile.followingCount", { count: user.followingCount })}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/users/${user.username}`}
            className="grid h-10 place-items-center rounded-md border border-neutral-300 px-4 text-sm font-medium text-neutral-800 transition hover:border-neutral-950"
          >
            {t(dictionary, "profile.publicProfile")}
          </Link>
          <Link
            href="/onboarding/interests"
            className="grid h-10 place-items-center rounded-md bg-neutral-950 px-4 text-sm font-medium text-white transition hover:bg-neutral-800"
          >
            {t(dictionary, "profile.interests")}
          </Link>
          <Link
            href="/boards/new"
            className="grid h-10 place-items-center rounded-md border border-neutral-300 px-4 text-sm font-medium text-neutral-800 transition hover:border-neutral-950"
          >
            {t(dictionary, "board.newBoard")}
          </Link>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
        <div>
          <h2 className="text-xl font-semibold text-neutral-950">{t(dictionary, "profile.profile")}</h2>
          <dl className="mt-5 grid gap-5 text-sm">
            <div>
              <dt className="font-medium text-neutral-950">{t(dictionary, "common.bio")}</dt>
              <dd className="mt-1 text-neutral-600">{user.bio || t(dictionary, "profile.noBio")}</dd>
            </div>
            <div>
              <dt className="font-medium text-neutral-950">{t(dictionary, "common.website")}</dt>
              <dd className="mt-1 text-neutral-600">
                {user.websiteUrl ? (
                  <a
                    href={user.websiteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-neutral-950 underline underline-offset-4"
                  >
                    {user.websiteUrl}
                  </a>
                ) : (
                  t(dictionary, "common.noWebsite")
                )}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-neutral-950">{t(dictionary, "profile.interests")}</dt>
              <dd className="mt-2 flex flex-wrap gap-2">
                {interests.length > 0 ? (
                  interests.map((interest) => (
                    <span
                      key={interest.id}
                      className="rounded-md bg-neutral-100 px-3 py-1 text-neutral-700"
                    >
                      {interest.category.name}
                    </span>
                  ))
                ) : (
                  <span className="text-neutral-600">{t(dictionary, "profile.noInterests")}</span>
                )}
              </dd>
            </div>
          </dl>
        </div>

        <section>
          <h2 className="text-xl font-semibold text-neutral-950">{t(dictionary, "profile.editProfile")}</h2>
          <div className="mt-5">
            <ProfileEditForm
              initialDisplayName={user.displayName}
              initialBio={user.bio}
              initialWebsiteUrl={user.websiteUrl}
              locale={locale}
            />
          </div>
        </section>
      </section>

      <section className="grid gap-5 border-t border-neutral-200 pt-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-neutral-950">{t(dictionary, "board.boards")}</h2>
            <p className="mt-1 text-sm text-neutral-500">
              {t(dictionary, "profile.boardsDescription")}
            </p>
          </div>
          <Link
            href="/boards/new"
            className="grid h-10 place-items-center rounded-md bg-neutral-950 px-4 text-sm font-medium text-white transition hover:bg-neutral-800"
          >
            {t(dictionary, "board.create")}
          </Link>
        </div>

        {boards.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {boards.map((board) => (
              <BoardCard key={board.id} board={board} locale={locale} />
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-neutral-200 px-4 py-8 text-center text-sm text-neutral-500">
            {t(dictionary, "board.noBoards")}
          </div>
        )}
      </section>
    </main>
    </>
  );
}
