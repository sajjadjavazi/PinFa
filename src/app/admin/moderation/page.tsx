import { PinStatus, Prisma } from "@prisma/client";
import Link from "next/link";
import { ModerationActionButton } from "@/components/admin/ModerationActionButton";
import { requireAdminPageUser } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const moderationPinSelect = {
  id: true,
  title: true,
  description: true,
  status: true,
  imageOriginalUrl: true,
  imageThumbnailUrl: true,
  imageFeedUrl: true,
  imageDetailUrl: true,
  width: true,
  height: true,
  reportCount: true,
  createdAt: true,
  owner: {
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      role: true,
      trustScore: true,
    },
  },
  category: {
    select: {
      name: true,
      slug: true,
      isSensitive: true,
    },
  },
  moderationResults: {
    orderBy: {
      createdAt: "desc",
    },
    select: {
      adultLikelihood: true,
      racyLikelihood: true,
      violenceLikelihood: true,
      medicalLikelihood: true,
      spoofLikelihood: true,
      decision: true,
      provider: true,
      createdAt: true,
      reviewedBy: {
        select: {
          displayName: true,
        },
      },
    },
    take: 1,
  },
} satisfies Prisma.PinSelect;

type ModerationPin = Prisma.PinGetPayload<{
  select: typeof moderationPinSelect;
}>;

export default async function AdminModerationPage() {
  await requireAdminPageUser();

  const [pendingPins, publishedPins] = await Promise.all([
    prisma.pin.findMany({
      where: {
        status: PinStatus.PENDING_REVIEW,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: moderationPinSelect,
      take: 50,
    }),
    prisma.pin.findMany({
      where: {
        status: PinStatus.PUBLISHED,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: moderationPinSelect,
      take: 20,
    }),
  ]);

  return (
    <div className="grid gap-8">
      <section className="flex flex-col gap-4 border-b border-neutral-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-neutral-500">Moderation</p>
          <h1 className="mt-1 text-3xl font-semibold text-neutral-950">
            Review Queue
          </h1>
        </div>
        <dl className="grid grid-cols-2 gap-3 text-sm sm:min-w-72">
          <div className="rounded-md bg-white px-4 py-3 shadow-sm ring-1 ring-neutral-200">
            <dt className="text-neutral-500">Pending</dt>
            <dd className="mt-1 text-2xl font-semibold">{pendingPins.length}</dd>
          </div>
          <div className="rounded-md bg-white px-4 py-3 shadow-sm ring-1 ring-neutral-200">
            <dt className="text-neutral-500">Published</dt>
            <dd className="mt-1 text-2xl font-semibold">{publishedPins.length}</dd>
          </div>
        </dl>
      </section>

      <section className="grid gap-4">
        <div>
          <h2 className="text-xl font-semibold">Pending Review</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Pins waiting for a manual moderation decision.
          </p>
        </div>

        {pendingPins.length > 0 ? (
          <div className="grid gap-4">
            {pendingPins.map((pin) => (
              <ModerationPinCard key={pin.id} pin={pin} mode="pending" />
            ))}
          </div>
        ) : (
          <EmptyState message="No Pins are pending review." />
        )}
      </section>

      <section className="grid gap-4 border-t border-neutral-200 pt-8">
        <div>
          <h2 className="text-xl font-semibold">Published Pins</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Recently published Pins available for removal.
          </p>
        </div>

        {publishedPins.length > 0 ? (
          <div className="grid gap-4">
            {publishedPins.map((pin) => (
              <ModerationPinCard key={pin.id} pin={pin} mode="published" />
            ))}
          </div>
        ) : (
          <EmptyState message="No published Pins are available." />
        )}
      </section>
    </div>
  );
}

function ModerationPinCard({
  mode,
  pin,
}: {
  mode: "pending" | "published";
  pin: ModerationPin;
}) {
  const moderationResult = pin.moderationResults[0] ?? null;
  const imageUrl =
    pin.imageThumbnailUrl ??
    pin.imageFeedUrl ??
    pin.imageDetailUrl ??
    pin.imageOriginalUrl;

  return (
    <article className="grid gap-5 rounded-md bg-white p-4 shadow-sm ring-1 ring-neutral-200 lg:grid-cols-[220px_minmax(0,1fr)_220px]">
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

      <div className="grid content-start gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-700">
              {pin.status}
            </span>
            {pin.category ? (
              <span className="rounded-md bg-sky-50 px-2 py-1 text-xs font-medium text-sky-800">
                {pin.category.name}
              </span>
            ) : (
              <span className="rounded-md bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-600">
                Uncategorized
              </span>
            )}
            {pin.category?.isSensitive ? (
              <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">
                Sensitive
              </span>
            ) : null}
          </div>
          <h3 className="mt-3 text-lg font-semibold text-neutral-950">
            {pin.title}
          </h3>
          {pin.description ? (
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-neutral-600">
              {pin.description}
            </p>
          ) : null}
        </div>

        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <InfoItem label="Uploader">
            <Link
              href={`/users/${pin.owner.username}`}
              className="font-medium text-neutral-950 underline-offset-4 hover:underline"
            >
              {pin.owner.displayName}
            </Link>
            <span className="block text-neutral-500">@{pin.owner.username}</span>
          </InfoItem>
          <InfoItem label="Category">
            {pin.category?.name ?? "Uncategorized"}
          </InfoItem>
          <InfoItem label="Reports">{pin.reportCount}</InfoItem>
          <InfoItem label="Size">
            {pin.width && pin.height ? `${pin.width} x ${pin.height}` : "Unknown"}
          </InfoItem>
        </dl>

        <section>
          <p className="text-sm font-medium text-neutral-950">SafeSearch</p>
          {moderationResult ? (
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
              <LikelihoodValue label="Adult" value={moderationResult.adultLikelihood} />
              <LikelihoodValue label="Racy" value={moderationResult.racyLikelihood} />
              <LikelihoodValue
                label="Violence"
                value={moderationResult.violenceLikelihood}
              />
              <LikelihoodValue
                label="Medical"
                value={moderationResult.medicalLikelihood}
              />
              <LikelihoodValue label="Spoof" value={moderationResult.spoofLikelihood} />
            </div>
          ) : (
            <p className="mt-2 text-sm text-neutral-500">No SafeSearch result.</p>
          )}
          {moderationResult ? (
            <p className="mt-2 text-xs text-neutral-500">
              {moderationResult.provider} · {moderationResult.decision}
            </p>
          ) : null}
        </section>
      </div>

      <div className="grid content-start gap-3">
        {mode === "pending" ? (
          <>
            <ModerationActionButton
              action="approve"
              label="Approve"
              pinId={pin.id}
              tone="approve"
            />
            <ModerationActionButton
              action="reject"
              label="Reject"
              pinId={pin.id}
              tone="reject"
            />
          </>
        ) : (
          <ModerationActionButton
            action="remove"
            label="Remove"
            pinId={pin.id}
            tone="remove"
          />
        )}
      </div>
    </article>
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

function LikelihoodValue({ label, value }: { label: string; value: string }) {
  return (
    <div className={`rounded-md px-2 py-2 ${likelihoodClasses(value)}`}>
      <span className="block font-medium">{label}</span>
      <span className="mt-1 block break-words">{value}</span>
    </div>
  );
}

function likelihoodClasses(value: string) {
  if (value === "LIKELY" || value === "VERY_LIKELY") {
    return "bg-red-50 text-red-800";
  }

  if (value === "POSSIBLE" || value === "UNKNOWN") {
    return "bg-amber-50 text-amber-800";
  }

  return "bg-emerald-50 text-emerald-800";
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-md bg-white px-4 py-8 text-center text-sm text-neutral-500 shadow-sm ring-1 ring-neutral-200">
      {message}
    </div>
  );
}
