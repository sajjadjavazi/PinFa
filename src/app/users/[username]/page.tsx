import Link from "next/link";
import { notFound } from "next/navigation";
import { BoardCard } from "@/components/boards/BoardCard";
import { FollowButton } from "@/components/FollowButton";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { ReportModal } from "@/components/social/ReportModal";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { publicProfileSelect } from "@/lib/user-selects";

type PublicProfilePageProps = {
  params: Promise<{
    username: string;
  }>;
};

export default async function PublicProfilePage({
  params,
}: PublicProfilePageProps) {
  const { username } = await params;
  const normalizedUsername = decodeURIComponent(username).toLowerCase();
  const [profile, currentUser] = await Promise.all([
    prisma.user.findFirst({
      where: {
        username: normalizedUsername,
        status: "ACTIVE",
      },
      select: publicProfileSelect,
    }),
    getCurrentUser(),
  ]);

  if (!profile) {
    notFound();
  }

  const isOwnProfile = currentUser?.id === profile.id;
  const follow = currentUser
    ? await prisma.userFollow.findUnique({
        where: {
          followerUserId_targetUserId: {
            followerUserId: currentUser.id,
            targetUserId: profile.id,
          },
        },
        select: {
          id: true,
        },
      })
    : null;
  const boards = await prisma.board.findMany({
    where: {
      ownerUserId: profile.id,
      visibility: "PUBLIC",
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
  });

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-5xl gap-10 px-6 py-10">
      <section className="flex flex-col gap-6 border-b border-neutral-200 pb-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-5">
          <ProfileAvatar
            avatarUrl={profile.avatarUrl}
            displayName={profile.displayName}
          />
          <div>
            <p className="text-sm text-neutral-500">@{profile.username}</p>
            <h1 className="mt-1 text-3xl font-semibold text-neutral-950">
              {profile.displayName}
            </h1>
            <div className="mt-3 flex gap-4 text-sm text-neutral-600">
              <span>{profile.followerCount} followers</span>
              <span>{profile.followingCount} following</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {isOwnProfile ? (
            <Link
              href="/profile"
              className="grid h-10 place-items-center rounded-md border border-neutral-300 px-4 text-sm font-medium text-neutral-800 transition hover:border-neutral-950"
            >
              Edit profile
            </Link>
          ) : currentUser ? (
            <FollowButton userId={profile.id} initialFollowing={Boolean(follow)} />
          ) : (
            <Link
              href="/auth/login"
              className="grid h-10 place-items-center rounded-md bg-neutral-950 px-4 text-sm font-medium text-white transition hover:bg-neutral-800"
            >
              Log in to follow
            </Link>
          )}
          {!isOwnProfile ? (
            <ReportModal
              isAuthenticated={Boolean(currentUser)}
              targetId={profile.id}
              targetType="USER"
            />
          ) : null}
        </div>
      </section>

      <section className="grid gap-5 text-sm">
        <div>
          <h2 className="text-xl font-semibold text-neutral-950">About</h2>
          <p className="mt-3 max-w-2xl leading-7 text-neutral-600">
            {profile.bio || "No bio yet."}
          </p>
        </div>
        {profile.websiteUrl ? (
          <a
            href={profile.websiteUrl}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-neutral-950 underline underline-offset-4"
          >
            {profile.websiteUrl}
          </a>
        ) : null}
      </section>

      <section className="grid gap-5 border-t border-neutral-200 pt-8">
        <h2 className="text-xl font-semibold text-neutral-950">Boards</h2>
        {boards.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {boards.map((board) => (
              <BoardCard key={board.id} board={board} />
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-neutral-200 px-4 py-8 text-center text-sm text-neutral-500">
            No public Boards yet.
          </div>
        )}
      </section>
    </main>
  );
}
