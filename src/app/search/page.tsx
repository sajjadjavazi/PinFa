import type { Metadata } from "next";
import { AppHeader } from "@/components/AppHeader";
import { SearchPageClient } from "@/components/search/SearchPageClient";
import { getCurrentUser } from "@/lib/auth";
import { normalizeSearchQuery, parseSearchType } from "@/lib/search";

export const dynamic = "force-dynamic";

type SearchPageProps = {
  searchParams: Promise<{
    q?: string;
    type?: string;
  }>;
};

export async function generateMetadata({
  searchParams,
}: SearchPageProps): Promise<Metadata> {
  const params = await searchParams;
  const query = normalizeSearchQuery(params.q);
  const title = query ? `Search for "${query}"` : "Search";
  const description = query
    ? `Search PinFa for Pins, Boards, Users, and Categories matching ${query}.`
    : "Search published Pins, public Boards, active Users, and Categories on PinFa.";

  return {
    alternates: {
      canonical: query
        ? `/search?q=${encodeURIComponent(query)}&type=${parseSearchType(params.type)}`
        : "/search",
    },
    description,
    openGraph: {
      description,
      title,
      type: "website",
      url: query
        ? `/search?q=${encodeURIComponent(query)}&type=${parseSearchType(params.type)}`
        : "/search",
    },
    title,
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const currentUser = await getCurrentUser().catch(() => null);

  return (
    <>
      <AppHeader currentUser={currentUser} />
      <SearchPageClient
        initialQuery={normalizeSearchQuery(params.q)}
        initialType={parseSearchType(params.type)}
      />
    </>
  );
}
