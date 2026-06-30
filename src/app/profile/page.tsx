import Link from "next/link";
import { redirect } from "next/navigation";
import { BoardCard } from "@/components/boards/BoardCard";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { ProfileEditForm } from "@/components/ProfileEditForm";
import { getCurrentUser } from "@/lib/auth";
import { getNotificationSummary } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

export default async function ProfilePage() {
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
          },
        },
      },
    }),
    getNotificationSummary({
      userId: user.id,
    }),
  ]);

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-5xl gap-10 px-6 py-10">
      <section className="flex flex-col gap-6 border-b border-neutral-200 pb-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-5">
          <ProfileAvatar avatarUrl={user.avatarUrl} displayName={user.displayName} />
          <div>
            <p className="text-sm text-neutral-500">@{user.username}</p>
            <h1 className="mt-1 text-3xl font-semibold text-neutral-950">
              {user.displayName}
            </h1>
            <div className="mt-3 flex gap-4 text-sm text-neutral-600">
              <span>{user.followerCount} followers</span>
              <span>{user.followingCount} following</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <NotificationDropdown
            initialNotifications={notificationSummary.recentNotifications}
            initialUnreadCount={notificationSummary.unreadCount}
          />
          <Link
            href={`/users/${user.username}`}
            className="grid h-10 place-items-center rounded-md border border-neutral-300 px-4 text-sm font-medium text-neutral-800 transition hover:border-neutral-950"
          >
            Public profile
          </Link>
          <Link
            href="/onboarding/interests"
            className="grid h-10 place-items-center rounded-md bg-neutral-950 px-4 text-sm font-medium text-white transition hover:bg-neutral-800"
          >
            Interests
          </Link>
          <Link
            href="/boards/new"
            className="grid h-10 place-items-center rounded-md border border-neutral-300 px-4 text-sm font-medium text-neutral-800 transition hover:border-neutral-950"
          >
            New Board
          </Link>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
        <div>
          <h2 className="text-xl font-semibold text-neutral-950">Profile</h2>
          <dl className="mt-5 grid gap-5 text-sm">
            <div>
              <dt className="font-medium text-neutral-950">Bio</dt>
              <dd className="mt-1 text-neutral-600">{user.bio || "No bio yet."}</dd>
            </div>
            <div>
              <dt className="font-medium text-neutral-950">Website</dt>
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
                  "No website yet."
                )}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-neutral-950">Interests</dt>
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
                  <span className="text-neutral-600">No interests selected.</span>
                )}
              </dd>
            </div>
          </dl>
        </div>

        <section>
          <h2 className="text-xl font-semibold text-neutral-950">Edit profile</h2>
          <div className="mt-5">
            <ProfileEditForm
              initialDisplayName={user.displayName}
              initialBio={user.bio}
              initialWebsiteUrl={user.websiteUrl}
            />
          </div>
        </section>
      </section>

      <section className="grid gap-5 border-t border-neutral-200 pt-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-neutral-950">Boards</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Collections you have created.
            </p>
          </div>
          <Link
            href="/boards/new"
            className="grid h-10 place-items-center rounded-md bg-neutral-950 px-4 text-sm font-medium text-white transition hover:bg-neutral-800"
          >
            Create Board
          </Link>
        </div>

        {boards.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {boards.map((board) => (
              <BoardCard key={board.id} board={board} />
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-neutral-200 px-4 py-8 text-center text-sm text-neutral-500">
            No Boards yet.
          </div>
        )}
      </section>
    </main>
  );
}
