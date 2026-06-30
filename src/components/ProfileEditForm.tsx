"use client";

import { FormEvent, useState } from "react";

type ProfileEditFormProps = {
  initialDisplayName: string;
  initialBio: string | null;
  initialWebsiteUrl: string | null;
};

type ApiErrors = Record<string, string>;

export function ProfileEditForm({
  initialDisplayName,
  initialBio,
  initialWebsiteUrl,
}: ProfileEditFormProps) {
  const [errors, setErrors] = useState<ApiErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setSaved(false);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/users/me", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        displayName: formData.get("displayName"),
        bio: formData.get("bio"),
        websiteUrl: formData.get("websiteUrl"),
      }),
    });
    const result = await response.json();

    setIsSubmitting(false);

    if (!response.ok) {
      setErrors(result.errors ?? { form: "Profile update failed." });
      return;
    }

    setSaved(true);
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5">
      <div className="grid gap-2">
        <label htmlFor="displayName" className="text-sm font-medium">
          Display name
        </label>
        <input
          id="displayName"
          name="displayName"
          defaultValue={initialDisplayName}
          required
          minLength={2}
          maxLength={80}
          className="h-11 rounded-md border border-neutral-300 px-3 outline-none transition focus:border-neutral-950"
        />
        <FieldError message={errors.displayName} />
      </div>

      <div className="grid gap-2">
        <label htmlFor="bio" className="text-sm font-medium">
          Bio
        </label>
        <textarea
          id="bio"
          name="bio"
          defaultValue={initialBio ?? ""}
          maxLength={500}
          rows={5}
          className="resize-none rounded-md border border-neutral-300 px-3 py-2 outline-none transition focus:border-neutral-950"
        />
        <FieldError message={errors.bio} />
      </div>

      <div className="grid gap-2">
        <label htmlFor="websiteUrl" className="text-sm font-medium">
          Website
        </label>
        <input
          id="websiteUrl"
          name="websiteUrl"
          type="url"
          defaultValue={initialWebsiteUrl ?? ""}
          placeholder="https://example.com"
          className="h-11 rounded-md border border-neutral-300 px-3 outline-none transition focus:border-neutral-950"
        />
        <FieldError message={errors.websiteUrl} />
      </div>

      <FieldError message={errors.form} />
      {saved ? <p className="text-sm text-green-700">Profile saved.</p> : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="h-11 rounded-md bg-neutral-950 px-4 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-400"
      >
        {isSubmitting ? "Saving..." : "Save profile"}
      </button>
    </form>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-sm text-red-600">{message}</p>;
}
