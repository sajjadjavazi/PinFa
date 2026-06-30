"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type CategoryOption = {
  id: string;
  name: string;
};

type PinUploadFormProps = {
  categories: CategoryOption[];
  maxImageSizeMb: number;
  allowedMimeTypes: string[];
};

type ApiErrors = Record<string, string>;

export function PinUploadForm({
  categories,
  maxImageSizeMb,
  allowedMimeTypes,
}: PinUploadFormProps) {
  const router = useRouter();
  const [errors, setErrors] = useState<ApiErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/uploads/image", {
      method: "POST",
      body: formData,
    });
    const result = await response.json();

    setIsSubmitting(false);

    if (!response.ok) {
      setErrors(result.errors ?? { form: "Upload failed." });
      return;
    }

    router.push(`/pins/${result.pin.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6">
      <div className="grid gap-2">
        <label htmlFor="image" className="text-sm font-medium">
          Image
        </label>
        <input
          id="image"
          name="image"
          type="file"
          accept={allowedMimeTypes.join(",")}
          required
          className="block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-neutral-950 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
        />
        <p className="text-sm text-neutral-500">
          JPG, JPEG, PNG, or WEBP. Max {maxImageSizeMb} MB.
        </p>
        <FieldError message={errors.image} />
      </div>

      <div className="grid gap-2">
        <label htmlFor="title" className="text-sm font-medium">
          Title
        </label>
        <input
          id="title"
          name="title"
          required
          minLength={2}
          maxLength={120}
          className="h-11 rounded-md border border-neutral-300 px-3 outline-none transition focus:border-neutral-950"
        />
        <FieldError message={errors.title} />
      </div>

      <div className="grid gap-2">
        <label htmlFor="description" className="text-sm font-medium">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          maxLength={1000}
          className="resize-none rounded-md border border-neutral-300 px-3 py-2 outline-none transition focus:border-neutral-950"
        />
        <FieldError message={errors.description} />
      </div>

      <div className="grid gap-2">
        <label htmlFor="categoryId" className="text-sm font-medium">
          Category
        </label>
        <select
          id="categoryId"
          name="categoryId"
          className="h-11 rounded-md border border-neutral-300 bg-white px-3 outline-none transition focus:border-neutral-950"
        >
          <option value="">No category</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <FieldError message={errors.categoryId} />
      </div>

      <FieldError message={errors.auth ?? errors.form} />

      <button
        type="submit"
        disabled={isSubmitting}
        className="h-11 rounded-md bg-neutral-950 px-4 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-400"
      >
        {isSubmitting ? "Uploading..." : "Upload Pin"}
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
