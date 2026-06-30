import Link from "next/link";

type BoardCardProps = {
  board: {
    id: string;
    title: string;
    description: string | null;
    pinCount: number;
    followerCount: number;
    coverPin: {
      title: string;
      imageThumbnailUrl: string | null;
      imageFeedUrl: string | null;
      imageDetailUrl: string | null;
    } | null;
  };
};

export function BoardCard({ board }: BoardCardProps) {
  const imageUrl =
    board.coverPin?.imageFeedUrl ??
    board.coverPin?.imageThumbnailUrl ??
    board.coverPin?.imageDetailUrl;

  return (
    <Link
      href={`/boards/${board.id}`}
      className="group grid gap-3 rounded-md border border-neutral-200 p-3 transition hover:border-neutral-950"
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={board.coverPin?.title ?? board.title}
          loading="lazy"
          decoding="async"
          className="aspect-[4/3] w-full rounded-md bg-neutral-100 object-cover"
        />
      ) : (
        <div className="grid aspect-[4/3] place-items-center rounded-md bg-neutral-100 text-sm text-neutral-500">
          No Pins
        </div>
      )}
      <div>
        <h3 className="font-semibold text-neutral-950 group-hover:underline">
          {board.title}
        </h3>
        {board.description ? (
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-neutral-600">
            {board.description}
          </p>
        ) : null}
        <p className="mt-2 text-sm text-neutral-500">
          {board.pinCount} Pins - {board.followerCount} followers
        </p>
      </div>
    </Link>
  );
}
