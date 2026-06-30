"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type CategoryOption = {
  id: string;
  name: string;
  slug: string;
};

type OnboardingInterestsFormProps = {
  categories: CategoryOption[];
  initialSelectedIds: string[];
};

export function OnboardingInterestsForm({
  categories,
  initialSelectedIds,
}: OnboardingInterestsFormProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState(new Set(initialSelectedIds));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function toggleCategory(categoryId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }

      return next;
    });
    setSaved(false);
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setIsSubmitting(true);

    const response = await fetch("/api/onboarding/interests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        categoryIds: Array.from(selectedIds),
      }),
    });
    const result = await response.json();

    setIsSubmitting(false);

    if (!response.ok) {
      setError(result.errors?.categoryIds ?? "Could not save interests.");
      return;
    }

    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => {
          const checked = selectedIds.has(category.id);

          return (
            <label
              key={category.id}
              className={`flex cursor-pointer items-center justify-between rounded-md border px-4 py-3 text-sm transition ${
                checked
                  ? "border-neutral-950 bg-neutral-950 text-white"
                  : "border-neutral-300 bg-white text-neutral-800 hover:border-neutral-500"
              }`}
            >
              <span>{category.name}</span>
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleCategory(category.id)}
                className="sr-only"
              />
            </label>
          );
        })}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {saved ? <p className="text-sm text-green-700">Interests saved.</p> : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="h-11 rounded-md bg-neutral-950 px-4 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-400"
      >
        {isSubmitting ? "Saving..." : "Save interests"}
      </button>
    </form>
  );
}
