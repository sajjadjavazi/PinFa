"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/t";
import { getDictionary, t } from "@/lib/i18n/t";
import type {
  SearchAllResponse,
  SearchApiResponse,
  SearchBoardResult,
  SearchCategoryResult,
  SearchPinResult,
  SearchType,
  SearchTypedResponse,
  SearchUserResult,
} from "@/lib/search";

const searchTypes = ["all", "pins", "boards", "users", "categories"] as const;

type SearchPageClientProps = {
  initialQuery: string;
  initialType: SearchType;
  locale: Locale;
};

export function SearchPageClient({
  initialQuery,
  initialType,
  locale,
}: SearchPageClientProps) {
  const dictionary = getDictionary(locale);
  const [inputValue, setInputValue] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const [type, setType] = useState<SearchType>(initialType);
  const [results, setResults] = useState<SearchApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canSubmit = inputValue.trim().length >= 2;

  const fetchSearch = useCallback(
    async (nextQuery: string, nextType: SearchType, cursor?: string | null) => {
      const trimmedQuery = nextQuery.trim();

      if (trimmedQuery.length < 2) {
        setResults(null);
        setError(null);
        return;
      }

      if (cursor) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const params = new URLSearchParams({
          limit: nextType === "all" ? "5" : "24",
          q: trimmedQuery,
          type: nextType,
        });

        if (cursor) {
          params.set("cursor", cursor);
        }

        const response = await fetch(`/api/search?${params.toString()}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.errors?.q ?? data.errors?.search ?? t(dictionary, "search.failed"));
          return;
        }

        setResults((current) =>
          cursor && current && data.type !== "all"
            ? mergeTypedResults(current, data)
            : data,
        );
      } catch {
        setError(t(dictionary, "search.failedTryAgain"));
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [dictionary],
  );

  useEffect(() => {
    void fetchSearch(query, type);
  }, [fetchSearch, query, type]);

  const counts = useMemo(() => getCounts(results), [results]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedQuery = inputValue.trim();

    if (trimmedQuery.length < 2) {
      setQuery(trimmedQuery);
      setResults(null);
      setError(null);
      return;
    }

    if (trimmedQuery === query) {
      void fetchSearch(trimmedQuery, type);
    } else {
      setQuery(trimmedQuery);
    }
  }

  function selectType(nextType: SearchType) {
    setType(nextType);
  }

  async function loadMore() {
    if (!results || results.type === "all" || !results.nextCursor) {
      return;
    }

    await fetchSearch(query, results.type, results.nextCursor);
  }

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="border-b border-neutral-200 pb-5">
        <p className="text-sm font-medium text-neutral-500">PinFa</p>
        <h1 className="mt-2 text-3xl font-semibold text-neutral-950">
          {t(dictionary, "search.heading")}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
          {t(dictionary, "search.intro")}
        </p>
      </section>

      <form onSubmit={submitSearch} className="flex flex-col gap-3 sm:flex-row">
        <input
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          placeholder={t(dictionary, "search.placeholder")}
          aria-label={t(dictionary, "nav.search")}
          dir="auto"
          className="h-11 flex-1 rounded-md border border-neutral-300 bg-white px-3 text-sm outline-none transition focus:border-neutral-950"
        />
        <button
          type="submit"
          disabled={!canSubmit}
          className="h-11 rounded-md bg-neutral-950 px-5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-400"
        >
          {t(dictionary, "search.heading")}
        </button>
      </form>

      <nav className="flex flex-wrap gap-2 border-b border-neutral-200 pb-3">
        {searchTypes.map((searchType) => (
          <button
            key={searchType}
            type="button"
            onClick={() => selectType(searchType)}
            className={
              searchType === type
                ? "rounded-md bg-neutral-950 px-3 py-2 text-sm font-medium text-white"
                : "rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 transition hover:border-neutral-950"
            }
          >
            {getSearchTypeLabel(dictionary, searchType)}
            {counts[searchType] !== null ? ` (${counts[searchType]})` : ""}
          </button>
        ))}
      </nav>

      {query.trim().length === 0 ? (
        <SearchState
          title={t(dictionary, "search.emptyQueryTitle")}
          message={t(dictionary, "search.emptyQueryMessage")}
        />
      ) : query.trim().length < 2 ? (
        <SearchState
          title={t(dictionary, "search.shortQueryTitle")}
          message={t(dictionary, "search.shortQueryMessage")}
        />
      ) : isLoading ? (
        <SearchLoading />
      ) : error ? (
        <SearchState title={t(dictionary, "search.loadFailedTitle")} message={error} />
      ) : results ? (
        <SearchResults dictionary={dictionary} results={results} />
      ) : (
        <SearchState
          title={t(dictionary, "search.noSearchTitle")}
          message={t(dictionary, "search.noSearchMessage")}
        />
      )}

      {results && results.type !== "all" && results.hasMore ? (
        <button
          type="button"
          onClick={() => void loadMore()}
          disabled={isLoadingMore}
          className="mx-auto h-11 rounded-md bg-neutral-950 px-5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-400"
        >
          {isLoadingMore ? t(dictionary, "search.loading") : t(dictionary, "search.loadMore")}
        </button>
      ) : null}
    </main>
  );
}

function SearchResults({
  dictionary,
  results,
}: {
  dictionary: Dictionary;
  results: SearchApiResponse;
}) {
  if (results.type === "all") {
    return <GroupedResults dictionary={dictionary} results={results} />;
  }

  if (results.items.length === 0) {
    return (
      <SearchState
        title={t(dictionary, "search.noResults")}
        message={t(dictionary, "search.tryDifferent")}
      />
    );
  }

  if (results.type === "pins") {
    return <PinResults dictionary={dictionary} pins={results.items as SearchPinResult[]} />;
  }

  if (results.type === "boards") {
    return <BoardResults boards={results.items as SearchBoardResult[]} dictionary={dictionary} />;
  }

  if (results.type === "users") {
    return <UserResults dictionary={dictionary} users={results.items as SearchUserResult[]} />;
  }

  return (
    <CategoryResults
      categories={results.items as SearchCategoryResult[]}
      dictionary={dictionary}
    />
  );
}

function GroupedResults({
  dictionary,
  results,
}: {
  dictionary: Dictionary;
  results: SearchAllResponse;
}) {
  const hasAnyResult =
    results.results.pins.length +
      results.results.boards.length +
      results.results.users.length +
      results.results.categories.length >
    0;

  if (!hasAnyResult) {
    return (
      <SearchState
        title={t(dictionary, "search.noResults")}
        message={t(dictionary, "search.tryDifferent")}
      />
    );
  }

  return (
    <div className="grid gap-10">
      <ResultSection count={results.counts.pins} dictionary={dictionary} title={t(dictionary, "search.pins")}>
        <PinResults dictionary={dictionary} pins={results.results.pins} />
      </ResultSection>
      <ResultSection count={results.counts.boards} dictionary={dictionary} title={t(dictionary, "search.boards")}>
        <BoardResults boards={results.results.boards} dictionary={dictionary} />
      </ResultSection>
      <ResultSection count={results.counts.users} dictionary={dictionary} title={t(dictionary, "search.users")}>
        <UserResults dictionary={dictionary} users={results.results.users} />
      </ResultSection>
      <ResultSection
        count={results.counts.categories}
        dictionary={dictionary}
        title={t(dictionary, "search.categories")}
      >
        <CategoryResults categories={results.results.categories} dictionary={dictionary} />
      </ResultSection>
    </div>
  );
}

function ResultSection({
  children,
  count,
  dictionary,
  title,
}: {
  children: ReactNode;
  count: number;
  dictionary: Dictionary;
  title: string;
}) {
  if (count === 0) {
    return null;
  }

  return (
    <section className="grid gap-4">
      <div className="flex items-end justify-between gap-4 border-b border-neutral-200 pb-2">
        <h2 className="text-lg font-semibold text-neutral-950">{title}</h2>
        <span className="text-sm text-neutral-500">
          {t(dictionary, "search.countResults", { count })}
        </span>
      </div>
      {children}
    </section>
  );
}

function PinResults({
  dictionary,
  pins,
}: {
  dictionary: Dictionary;
  pins: SearchPinResult[];
}) {
  if (pins.length === 0) {
    return (
      <SearchState
        title={t(dictionary, "search.noPins")}
        message={t(dictionary, "search.noPinsMessage")}
      />
    );
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
              dictionary={dictionary}
              height={pin.height}
              src={pin.imageUrl}
              width={pin.width}
            />
            <div className="grid gap-2 p-3">
              <p className="text-xs font-medium text-neutral-500">
                {pin.category?.name ?? t(dictionary, "common.uncategorized")}
              </p>
              <h2 className="text-sm font-semibold leading-6 text-neutral-950 group-hover:underline">
                {pin.title}
              </h2>
              <p className="text-xs text-neutral-500">
                {t(dictionary, "search.byOwner", { owner: pin.owner.displayName })}
              </p>
            </div>
          </Link>
        </article>
      ))}
    </section>
  );
}

function BoardResults({
  boards,
  dictionary,
}: {
  boards: SearchBoardResult[];
  dictionary: Dictionary;
}) {
  if (boards.length === 0) {
    return (
      <SearchState
        title={t(dictionary, "search.noBoards")}
        message={t(dictionary, "search.noBoardsMessage")}
      />
    );
  }

  return (
    <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {boards.map((board) => (
        <article
          key={board.id}
          className="overflow-hidden rounded-md border border-neutral-200 bg-white shadow-sm"
        >
          <Link href={`/boards/${board.id}`} className="group block">
            <SearchImage
              alt={board.title}
              dictionary={dictionary}
              height={3}
              src={board.coverImageUrl}
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
                {t(dictionary, "board.pinCount", { count: board.pinCount })} -{" "}
                {t(dictionary, "board.followerCount", { count: board.followerCount })}
              </p>
              <p className="text-xs text-neutral-500">
                {t(dictionary, "search.byOwner", { owner: board.owner.displayName })}
              </p>
            </div>
          </Link>
        </article>
      ))}
    </section>
  );
}

function UserResults({
  dictionary,
  users,
}: {
  dictionary: Dictionary;
  users: SearchUserResult[];
}) {
  if (users.length === 0) {
    return (
      <SearchState
        title={t(dictionary, "search.noUsers")}
        message={t(dictionary, "search.noUsersMessage")}
      />
    );
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
          <div className="min-w-0">
            <h2 className="font-semibold text-neutral-950">{user.displayName}</h2>
            <p className="text-sm text-neutral-500">@{user.username}</p>
            {user.bio ? (
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-neutral-600">
                {user.bio}
              </p>
            ) : null}
            <p className="mt-2 text-xs text-neutral-500">
              {t(dictionary, "profile.followerCount", { count: user.followerCount })}
            </p>
          </div>
        </Link>
      ))}
    </section>
  );
}

function CategoryResults({
  categories,
  dictionary,
}: {
  categories: SearchCategoryResult[];
  dictionary: Dictionary;
}) {
  if (categories.length === 0) {
    return (
      <SearchState
        title={t(dictionary, "search.noCategories")}
        message={t(dictionary, "search.noCategoriesMessage")}
      />
    );
  }

  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((category) => (
        <Link
          key={category.id}
          href={`/search?q=${encodeURIComponent(category.slug)}&type=pins`}
          className="rounded-md border border-neutral-200 bg-white p-4 shadow-sm transition hover:border-neutral-950"
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
        </Link>
      ))}
    </section>
  );
}

function SearchImage({
  alt,
  dictionary,
  height,
  src,
  width,
}: {
  alt: string;
  dictionary: Dictionary;
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
        {t(dictionary, "search.imageUnavailable")}
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

function getSearchTypeLabel(dictionary: Dictionary, type: SearchType) {
  return t(dictionary, `search.${type}`);
}

function SearchLoading() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="h-48 animate-pulse rounded-md bg-neutral-100"
        />
      ))}
    </div>
  );
}

function SearchState({ message, title }: { message: string; title: string }) {
  return (
    <div className="grid gap-2 rounded-md border border-neutral-200 bg-white px-4 py-10 text-center">
      <h2 className="font-semibold text-neutral-950">{title}</h2>
      <p className="text-sm text-neutral-500">{message}</p>
    </div>
  );
}

function getCounts(results: SearchApiResponse | null) {
  const emptyCounts: Record<SearchType, number | null> = {
    all: null,
    boards: null,
    categories: null,
    pins: null,
    users: null,
  };

  if (!results) {
    return emptyCounts;
  }

  if (results.type === "all") {
    return {
      all:
        results.counts.pins +
        results.counts.boards +
        results.counts.users +
        results.counts.categories,
      ...results.counts,
    };
  }

  return {
    ...emptyCounts,
    [results.type]: results.count,
  };
}

function mergeTypedResults(
  current: SearchApiResponse,
  next: SearchTypedResponse,
): SearchApiResponse {
  if (current.type === "all" || current.type !== next.type) {
    return next;
  }

  return {
    ...next,
    items: [...current.items, ...next.items],
  };
}
