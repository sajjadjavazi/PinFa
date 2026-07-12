import type { Metadata } from "next";
import { AppHeader } from "@/components/AppHeader";
import { SearchPageClient } from "@/components/search/SearchPageClient";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { getDictionary, t } from "@/lib/i18n/t";
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
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const query = normalizeSearchQuery(params.q);
  const title = query
    ? t(dictionary, "meta.searchForTitle", { query })
    : t(dictionary, "meta.searchTitle");
  const description = query
    ? t(dictionary, "meta.searchForDescription", { query })
    : t(dictionary, "meta.searchDescription");

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
  const locale = await getCurrentLocale();
  const currentUser = await getCurrentUser().catch(() => null);

  return (
    <>
      <AppHeader currentUser={currentUser} locale={locale} />
      <SearchPageClient
        initialQuery={normalizeSearchQuery(params.q)}
        initialType={parseSearchType(params.type)}
        locale={locale}
      />
    </>
  );
}
