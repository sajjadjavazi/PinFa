import Link from "next/link";
import { notFound } from "next/navigation";
import { BoardFollowButton } from "@/components/boards/BoardFollowButton";
import { RemovePinFromBoardButton } from "@/components/boards/RemovePinFromBoardButton";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { ReportModal } from "@/components/social/ReportModal";
import { canAccessAdmin } from "@/lib/admin";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { publicProfileSelect } from "@/lib/user-selects";

type BoardDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function BoardDetailPage({ params }: BoardDetailPageProps) {
  const { id } = await params;
  const [board, currentUser] = await Promise.all([
    prisma.board.findUnique({
      where: {
        id,
      },
      include: {
        owner: {
          select: publicProfileSelect,
        },
        coverPin: {
          select: {
            title: true,
            imageThumbnailUrl: true,
            imageFeedUrl: true,
            imageDetailUrl: true,
          },
        },
        pins: {
          orderBy: {
            createdAt: "desc",
          },
          where: {
            pin: {
              status: "PUBLISHED",
            },
          },
          include: {
            pin: {
              select: {
                id: true,
                title: true,
                description: true,
                status: true,
                imageThumbnailUrl: true,
                imageFeedUrl: true,
                imageDetailUrl: true,
                saveCount: true,
                owner: {
                  select: {
                    username: true,
                    displayName: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
    getCurrentUser(),
  ]);

  if (!board) {
    notFound();
  }

  const isOwner = currentUser?.id === board.ownerUserId;
  const isAdmin = canAccessAdmin(currentUser);

  if (board.visibility !== "PUBLIC" && !isOwner && !isAdmin) {
    notFound();
  }

  const following = currentUser
    ? await prisma.boardFollow.findUnique({
        where: {
          userId_boardId: {
            userId: currentUser.id,
            boardId: board.id,
          },
        },
        select: {
          id: true,
        },
      })
    : null;
  const coverUrl =
    board.coverPin?.imageFeedUrl ??
    board.coverPin?.imageThumbnailUrl ??
    board.coverPin?.imageDetailUrl;

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-6xl gap-10 px-6 py-10">
      <section className="grid gap-6 border-b border-neutral-200 pb-8 lg:grid-cols-[260px_minmax(0,1fr)]">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={`${board.title} cover`}
            loading="eager"
            decoding="async"
            className="aspect-[4/3] w-full rounded-md bg-neutral-100 object-cover"
          />
        ) : (
          <div className="grid aspect-[4/3] place-items-center rounded-md bg-neutral-100 text-sm text-neutral-500">
            No cover
          </div>
        )}

        <div className="grid content-center gap-5">
          <div>
            <p className="text-sm text-neutral-500">{board.visibility}</p>
            <h1 className="mt-2 text-4xl font-semibold text-neutral-950">
              {board.title}
            </h1>
            {board.description ? (
              <p className="mt-4 max-w-2xl leading-7 text-neutral-600">
                {board.description}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-5 text-sm text-neutral-600">
            <span>{board.pinCount} Pins</span>
            <span>{board.followerCount} followers</span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <ProfileAvatar
              avatarUrl={board.owner.avatarUrl}
              displayName={board.owner.displayName}
              size="sm"
            />
            <div>
              <Link
                href={`/users/${board.owner.username}`}
                className="font-medium text-neutral-950 underline-offset-4 hover:underline"
              >
                {board.owner.displayName}
              </Link>
              <p className="text-sm text-neutral-500">@{board.owner.username}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {isOwner ? (
              <Link
                href="/boards/new"
                className="grid h-10 place-items-center rounded-md border border-neutral-300 px-4 text-sm font-medium text-neutral-800 transition hover:border-neutral-950"
              >
                New Board
              </Link>
            ) : currentUser ? (
              <BoardFollowButton
                boardId={board.id}
                initialFollowing={Boolean(following)}
              />
            ) : (
              <Link
                href="/auth/login"
                className="grid h-10 place-items-center rounded-md bg-neutral-950 px-4 text-sm font-medium text-white transition hover:bg-neutral-800"
              >
                Log in to follow
              </Link>
            )}
            {!isOwner ? (
              <ReportModal
                isAuthenticated={Boolean(currentUser)}
                targetId={board.id}
                targetType="BOARD"
              />
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-5">
        <h2 className="text-xl font-semibold text-neutral-950">Pins</h2>
        {board.pins.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {board.pins.map((boardPin) => (
              <article key={boardPin.id} className="grid gap-3">
                <Link href={`/pins/${boardPin.pin.id}`} className="group grid gap-3">
                  <PinImage pin={boardPin.pin} />
                  <div>
                    <h3 className="font-semibold text-neutral-950 group-hover:underline">
                      {boardPin.pin.title}
                    </h3>
                    <p className="mt-1 text-sm text-neutral-500">
                      by {boardPin.pin.owner.displayName}
                    </p>
                  </div>
                </Link>
                {isOwner ? (
                  <RemovePinFromBoardButton
                    boardId={board.id}
                    pinId={boardPin.pin.id}
                  />
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-neutral-200 px-4 py-8 text-center text-sm text-neutral-500">
            This Board has no visible Pins yet.
          </div>
        )}
      </section>
    </main>
  );
}

function PinImage({
  pin,
}: {
  pin: {
    title: string;
    imageThumbnailUrl: string | null;
    imageFeedUrl: string | null;
    imageDetailUrl: string | null;
  };
}) {
  const imageUrl = pin.imageFeedUrl ?? pin.imageThumbnailUrl ?? pin.imageDetailUrl;

  if (!imageUrl) {
    return (
      <div className="grid aspect-[4/3] place-items-center rounded-md bg-neutral-100 text-sm text-neutral-500">
        Image unavailable
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={pin.title}
      loading="lazy"
      decoding="async"
      className="aspect-[4/3] w-full rounded-md bg-neutral-100 object-cover"
    />
  );
}
