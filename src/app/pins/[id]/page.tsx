import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { SaveToBoardForm } from "@/components/boards/SaveToBoardForm";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { PinSocialActions } from "@/components/social/PinSocialActions";
import { canAccessAdmin } from "@/lib/admin";
import { getCurrentUser } from "@/lib/auth";
import { applyCategoryInterestSignal } from "@/lib/interest-signals";
import { prisma } from "@/lib/prisma";
import { publicProfileSelect } from "@/lib/user-selects";

type PinDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function generateMetadata({
  params,
}: PinDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const pin = await prisma.pin.findFirst({
    where: {
      id,
      status: "PUBLISHED",
    },
    select: {
      category: {
        select: {
          name: true,
        },
      },
      description: true,
      height: true,
      imageDetailUrl: true,
      imageFeedUrl: true,
      imageThumbnailUrl: true,
      title: true,
      width: true,
      owner: {
        select: {
          displayName: true,
          username: true,
        },
      },
    },
  });

  if (!pin) {
    return {
      title: "Pin not available",
      robots: {
        follow: false,
        index: false,
      },
    };
  }

  const description =
    pin.description?.trim() ||
    `A visual idea by ${pin.owner.displayName}${
      pin.category ? ` in ${pin.category.name}` : ""
    } on PinFa.`;
  const imageUrl =
    pin.imageDetailUrl ?? pin.imageFeedUrl ?? pin.imageThumbnailUrl ?? undefined;

  return {
    alternates: {
      canonical: `/pins/${id}`,
    },
    title: pin.title,
    description: truncateDescription(description),
    openGraph: {
      description: truncateDescription(description),
      images: imageUrl
        ? [
            {
              alt: pin.title,
              height: pin.height ?? undefined,
              url: imageUrl,
              width: pin.width ?? undefined,
            },
          ]
        : undefined,
      title: pin.title,
      type: "article",
      url: `/pins/${id}`,
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      description: truncateDescription(description),
      images: imageUrl ? [imageUrl] : undefined,
      title: pin.title,
    },
  };
}

export default async function PinDetailPage({ params }: PinDetailPageProps) {
  const { id } = await params;
  const [pin, currentUser] = await Promise.all([
    prisma.pin.findUnique({
      where: {
        id,
      },
      include: {
        category: {
          select: {
            name: true,
            slug: true,
          },
        },
        imageAsset: true,
        owner: {
          select: publicProfileSelect,
        },
      },
    }),
    getCurrentUser(),
  ]);

  if (!pin) {
    notFound();
  }

  const isOwner = currentUser?.id === pin.ownerUserId;
  const isAdmin = canAccessAdmin(currentUser);

  if (pin.status !== "PUBLISHED" && !isOwner && !isAdmin) {
    notFound();
  }

  const imageUrl =
    pin.imageDetailUrl ??
    pin.imageFeedUrl ??
    pin.imageThumbnailUrl ??
    (isAdmin || isOwner ? pin.imageOriginalUrl : null);
  const [boards, like] =
    currentUser && pin.status === "PUBLISHED"
      ? await Promise.all([
          prisma.board.findMany({
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
          }),
          prisma.like.findUnique({
            where: {
              userId_pinId: {
                userId: currentUser.id,
                pinId: pin.id,
              },
            },
            select: {
              id: true,
            },
          }),
        ])
      : [[], null];

  if (currentUser && pin.status === "PUBLISHED") {
    await prisma.$transaction([
      prisma.userEvent.create({
        data: {
          userId: currentUser.id,
          eventType: "OPEN_PIN",
          targetType: "PIN",
          targetId: pin.id,
          metadataJson: {
            source: "pin_detail",
          },
        },
      }),
      prisma.pin.update({
        where: {
          id: pin.id,
        },
        data: {
          viewCount: {
            increment: 1,
          },
        },
      }),
    ]);

    await applyCategoryInterestSignal({
      categoryId: pin.categoryId,
      signal: "open",
      userId: currentUser.id,
    });
  }

  return (
    <>
    <AppHeader currentUser={currentUser} />
    <main className="mx-auto grid min-h-screen w-full max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] lg:px-8">
      <section>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={pin.title}
            width={pin.width ?? undefined}
            height={pin.height ?? undefined}
            loading="eager"
            decoding="async"
            className="max-h-[75vh] w-full rounded-md bg-neutral-100 object-contain"
          />
        ) : (
          <div className="grid aspect-[4/3] place-items-center rounded-md bg-neutral-100 text-sm text-neutral-500">
            Image unavailable
          </div>
        )}
      </section>

      <aside className="grid content-start gap-6">
        {pin.status !== "PUBLISHED" ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            This Pin is {pin.status.toLowerCase()} and is not public.
          </div>
        ) : null}

        <section>
          <p className="text-sm text-neutral-500">
            {pin.category?.name ?? "Uncategorized"}
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-neutral-950">
            {pin.title}
          </h1>
          {pin.description ? (
            <p className="mt-4 leading-7 text-neutral-600">{pin.description}</p>
          ) : null}
        </section>

        <section className="flex items-center gap-4 border-t border-neutral-200 pt-6">
          <ProfileAvatar
            avatarUrl={pin.owner.avatarUrl}
            displayName={pin.owner.displayName}
            size="sm"
          />
          <div>
            <Link
              href={`/users/${pin.owner.username}`}
              className="font-medium text-neutral-950"
            >
              {pin.owner.displayName}
            </Link>
            <p className="text-sm text-neutral-500">@{pin.owner.username}</p>
          </div>
        </section>

        {pin.status === "PUBLISHED" ? (
          <section className="border-t border-neutral-200 pt-6">
            <PinSocialActions
              initialLiked={Boolean(like)}
              initialLikeCount={pin.likeCount}
              initialReportCount={pin.reportCount}
              initialShareCount={pin.shareCount}
              isAuthenticated={Boolean(currentUser)}
              pinId={pin.id}
            />
          </section>
        ) : null}

        {pin.status === "PUBLISHED" ? (
          <section className="border-t border-neutral-200 pt-6">
            {currentUser ? (
              <SaveToBoardForm boards={boards} pinId={pin.id} />
            ) : (
              <Link
                href="/auth/login"
                className="grid h-10 place-items-center rounded-md bg-neutral-950 px-4 text-sm font-medium text-white transition hover:bg-neutral-800"
              >
                Log in to save
              </Link>
            )}
          </section>
        ) : null}

        <dl className="grid grid-cols-2 gap-4 border-t border-neutral-200 pt-6 text-sm">
          <div>
            <dt className="font-medium text-neutral-950">Status</dt>
            <dd className="mt-1 text-neutral-600">{pin.status}</dd>
          </div>
          <div>
            <dt className="font-medium text-neutral-950">File type</dt>
            <dd className="mt-1 text-neutral-600">
              {pin.imageAsset?.mimeType ?? "Unknown"}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-neutral-950">Image asset</dt>
            <dd className="mt-1 text-neutral-600">
              {pin.imageAsset?.status ?? "Unknown"}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-neutral-950">Dimensions</dt>
            <dd className="mt-1 text-neutral-600">
              {pin.width && pin.height ? `${pin.width} x ${pin.height}` : "Pending"}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-neutral-950">Saves</dt>
            <dd className="mt-1 text-neutral-600">{pin.saveCount}</dd>
          </div>
          <div>
            <dt className="font-medium text-neutral-950">Reports</dt>
            <dd className="mt-1 text-neutral-600">{pin.reportCount}</dd>
          </div>
        </dl>
      </aside>
    </main>
    </>
  );
}

function truncateDescription(value: string) {
  return value.length > 160 ? `${value.slice(0, 157).trimEnd()}...` : value;
}
