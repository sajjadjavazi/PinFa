import Link from "next/link";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { getCurrentUser } from "@/lib/auth";
import {
  canSearch,
  normalizeSearchQuery,
  parseSearchTab,
  recordSearchEvent,
  searchAll,
  searchTabs,
  type SearchBoardResult,
  type SearchCategoryResult,
  type SearchPinResult,
  type SearchResults,
  type SearchTab,
  type SearchUserResult,
} from "@/lib/search";

export const dynamic = "force-dynamic";

type SearchPageProps = {
  searchParams: Promise<{
    q?: string;
    type?: string;
  }>;
};

const tabLabels: Record<SearchTab, string> = {
  boards: "Boards",
  categories: "Categories",
  pins: "Pins",
  users: "Users",
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = normalizeSearchQuery(params.q);
  const activeTab = parseSearchTab(params.type);
  const shouldSearch = canSearch(query);
  const [currentUser, results] = await Promise.all([
    getCurrentUser(),
    shouldSearch ? searchAll({ query }) : emptyResults(query),
  ]);

  if (shouldSearch) {
    await recordSearchEvent({
      query,
      resultCounts: {
        boards: results.boards.length,
        categories: results.categories.length,
        pins: results.pins.length,
        users: results.users.length,
      },
      source: "search_page",
      tab: activeTab,
      userId: currentUser?.id,
    });
  }

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-7xl gap-8 px-5 py-6 sm:px-6 lg:px-8">
      <section className="flex flex-col gap-5 border-b border-neutral-200 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium text-neutral-500">PinFa</p>
          <h1 className="mt-2 text-3xl font-semibold text-neutral-950">
            Search
          </h1>
        </div>
        <nav className="flex flex-wrap gap-3">
          <Link
            href="/"
            className="grid h-10 place-items-center rounded-md border border-neutral-300 px-4 text-sm font-medium text-neutral-800 transition hover:border-neutral-950"
          >
            Home
          </Link>
          {currentUser ? (
            <Link
              href="/profile"
              className="grid h-10 place-items-center rounded-md border border-neutral-300 px-4 text-sm font-medium text-neutral-800 transition hover:border-neutral-950"
            >
              Profile
            </Link>
          ) : (
            <Link
              href="/auth/login"
              className="grid h-10 place-items-center rounded-md bg-neutral-950 px-4 text-sm font-medium text-white transition hover:bg-neutral-800"
            >
              Log in
            </Link>
          )}
        </nav>
      </section>

      <form action="/search" className="flex flex-col gap-3 sm:flex-row">
        <input type="hidden" name="type" value={activeTab} />
        <input
          name="q"
          defaultValue={query}
          placeholder="Search"
          className="h-11 flex-1 rounded-md border border-neutral-300 bg-white px-3 text-sm outline-none transition focus:border-neutral-950"
        />
        <button
          type="submit"
          className="h-11 rounded-md bg-neutral-950 px-5 text-sm font-medium text-white transition hover:bg-neutral-800"
        >
          Search
        </button>
      </form>

      <nav className="flex flex-wrap gap-2 border-b border-neutral-200 pb-3">
        {searchTabs.map((tab) => (
          <Link
            key={tab}
            href={getTabHref(query, tab)}
            className={
              tab === activeTab
                ? "rounded-md bg-neutral-950 px-3 py-2 text-sm font-medium text-white"
                : "rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 transition hover:border-neutral-950"
            }
          >
            {tabLabels[tab]} ({getResultCount(results, tab)})
          </Link>
        ))}
      </nav>

      {!shouldSearch ? (
        <EmptyState message="Enter at least 2 characters." />
      ) : (
        <SearchResultsPanel activeTab={activeTab} results={results} />
      )}
    </main>
  );
}

function SearchResultsPanel({
  activeTab,
  results,
}: {
  activeTab: SearchTab;
  results: SearchResults;
}) {
  if (activeTab === "pins") {
    return <PinResults pins={results.pins} />;
  }

  if (activeTab === "boards") {
    return <BoardResults boards={results.boards} />;
  }

  if (activeTab === "users") {
    return <UserResults users={results.users} />;
  }

  return <CategoryResults categories={results.categories} />;
}

function PinResults({ pins }: { pins: SearchPinResult[] }) {
  if (pins.length === 0) {
    return <EmptyState message="No Pins found." />;
  }

  return (
    <section className="columns-1 gap-5 sm:columns-2 lg:columns-3 xl:columns-4">
      {pins.map((pin) => (
        <article
          key={pin.id}
          className="mb-5 break-inside-avoid overflow-hidden rounded-md border border-neutral-200 bg-white shadow-sm"
        >
          <Link href={`/pins/${pin.id}`} className="group block">
            <SearchImage
              alt={pin.title}
              height={pin.height}
              src={pin.imageFeedUrl ?? pin.imageThumbnailUrl}
              width={pin.width}
            />
            <div className="grid gap-2 p-3">
              <p className="text-xs font-medium text-neutral-500">
                {pin.category?.name ?? "Uncategorized"}
              </p>
              <h2 className="text-sm font-semibold leading-6 text-neutral-950 group-hover:underline">
                {pin.title}
              </h2>
              <p className="text-xs text-neutral-500">
                by {pin.owner.displayName}
              </p>
            </div>
          </Link>
        </article>
      ))}
    </section>
  );
}

function BoardResults({ boards }: { boards: SearchBoardResult[] }) {
  if (boards.length === 0) {
    return <EmptyState message="No Boards found." />;
  }

  return (
    <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {boards.map((board) => {
        const coverUrl =
          board.coverPin?.status === "PUBLISHED"
            ? board.coverPin.imageFeedUrl ?? board.coverPin.imageThumbnailUrl
            : null;

        return (
          <article
            key={board.id}
            className="overflow-hidden rounded-md border border-neutral-200 bg-white shadow-sm"
          >
            <Link href={`/boards/${board.id}`} className="group block">
              <SearchImage
                alt={board.coverPin?.title ?? board.title}
                height={3}
                src={coverUrl}
                width={4}
              />
              <div className="grid gap-2 p-4">
                <h2 className="font-semibold text-neutral-950 group-hover:underline">
                  {board.title}
                </h2>
                {board.description ? (
                  <p className="line-clamp-2 text-sm leading-6 text-neutral-600">
                    {board.description}
                  </p>
                ) : null}
                <p className="text-xs text-neutral-500">
                  {board.pinCount} Pins by {board.owner.displayName}
                </p>
              </div>
            </Link>
          </article>
        );
      })}
    </section>
  );
}

function UserResults({ users }: { users: SearchUserResult[] }) {
  if (users.length === 0) {
    return <EmptyState message="No Users found." />;
  }

  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {users.map((user) => (
        <Link
          key={user.id}
          href={`/users/${user.username}`}
          className="flex gap-4 rounded-md border border-neutral-200 bg-white p-4 shadow-sm transition hover:border-neutral-950"
        >
          <ProfileAvatar
            avatarUrl={user.avatarUrl}
            displayName={user.displayName}
            size="sm"
          />
          <div>
            <h2 className="font-semibold text-neutral-950">{user.displayName}</h2>
            <p className="text-sm text-neutral-500">@{user.username}</p>
            <p className="mt-2 text-xs text-neutral-500">
              {user.followerCount} followers
            </p>
          </div>
        </Link>
      ))}
    </section>
  );
}

function CategoryResults({
  categories,
}: {
  categories: SearchCategoryResult[];
}) {
  if (categories.length === 0) {
    return <EmptyState message="No Categories found." />;
  }

  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((category) => (
        <article
          key={category.id}
          className="rounded-md border border-neutral-200 bg-white p-4 shadow-sm"
        >
          <p className="text-xs font-medium text-neutral-500">
            /{category.slug}
          </p>
          <h2 className="mt-2 font-semibold text-neutral-950">{category.name}</h2>
          {category.description ? (
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-neutral-600">
              {category.description}
            </p>
          ) : null}
        </article>
      ))}
    </section>
  );
}

function SearchImage({
  alt,
  height,
  src,
  width,
}: {
  alt: string;
  height: number | null;
  src: string | null | undefined;
  width: number | null;
}) {
  const aspectRatio = width && height ? `${width} / ${height}` : "4 / 3";

  if (!src) {
    return (
      <div
        className="grid w-full place-items-center bg-neutral-100 text-sm text-neutral-500"
        style={{ aspectRatio }}
      >
        Image unavailable
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      width={width ?? undefined}
      height={height ?? undefined}
      loading="lazy"
      decoding="async"
      className="w-full bg-neutral-100 object-cover transition group-hover:brightness-95"
      style={{ aspectRatio }}
    />
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-neutral-200 bg-white px-4 py-10 text-center text-sm text-neutral-500">
      {message}
    </div>
  );
}

function getTabHref(query: string, tab: SearchTab) {
  const params = new URLSearchParams({
    type: tab,
  });

  if (query) {
    params.set("q", query);
  }

  return `/search?${params.toString()}`;
}

function getResultCount(results: SearchResults, tab: SearchTab) {
  return results[tab].length;
}

function emptyResults(query: string): SearchResults {
  return {
    boards: [],
    categories: [],
    pins: [],
    query,
    users: [],
  };
}
