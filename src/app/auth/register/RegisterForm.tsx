"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary, t } from "@/lib/i18n/t";

type ApiErrors = Record<string, string>;

export function RegisterForm({ locale }: { locale: Locale }) {
  const router = useRouter();
  const dictionary = getDictionary(locale);
  const [errors, setErrors] = useState<ApiErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: formData.get("username"),
        displayName: formData.get("displayName"),
        email: formData.get("email"),
        phone: formData.get("phone"),
        password: formData.get("password"),
        termsAccepted: formData.get("termsAccepted") === "on",
      }),
    });
    const result = await response.json();

    setIsSubmitting(false);

    if (!response.ok) {
      setErrors(result.errors ?? { form: t(dictionary, "auth.registrationFailed") });
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5">
      <div className="grid gap-2">
        <label htmlFor="username" className="text-sm font-medium">
          {t(dictionary, "auth.username")}
        </label>
        <input
          id="username"
          name="username"
          autoComplete="username"
          required
          minLength={3}
          maxLength={30}
          pattern="[a-zA-Z0-9_]+"
          dir="ltr"
          className="h-11 rounded-md border border-neutral-300 px-3 outline-none transition focus:border-neutral-950"
        />
        <FieldError message={errors.username} />
      </div>

      <div className="grid gap-2">
        <label htmlFor="displayName" className="text-sm font-medium">
          {t(dictionary, "auth.displayName")}
        </label>
        <input
          id="displayName"
          name="displayName"
          autoComplete="name"
          required
          minLength={2}
          maxLength={80}
          className="h-11 rounded-md border border-neutral-300 px-3 outline-none transition focus:border-neutral-950"
        />
        <FieldError message={errors.displayName} />
      </div>

      <div className="grid gap-2">
        <label htmlFor="email" className="text-sm font-medium">
          {t(dictionary, "auth.email")}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          dir="ltr"
          className="h-11 rounded-md border border-neutral-300 px-3 outline-none transition focus:border-neutral-950"
        />
        <FieldError message={errors.email} />
      </div>

      <div className="grid gap-2">
        <label htmlFor="phone" className="text-sm font-medium">
          {t(dictionary, "auth.phone")}
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          dir="ltr"
          className="h-11 rounded-md border border-neutral-300 px-3 outline-none transition focus:border-neutral-950"
        />
        <FieldError message={errors.phone ?? errors.contact} />
      </div>

      <div className="grid gap-2">
        <label htmlFor="password" className="text-sm font-medium">
          {t(dictionary, "auth.password")}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={128}
          dir="ltr"
          className="h-11 rounded-md border border-neutral-300 px-3 outline-none transition focus:border-neutral-950"
        />
        <FieldError message={errors.password} />
      </div>

      <label className="flex items-start gap-3 text-sm text-neutral-700">
        <input
          name="termsAccepted"
          type="checkbox"
          required
          className="mt-1 h-4 w-4 rounded border-neutral-300"
        />
        <span>{t(dictionary, "auth.terms")}</span>
      </label>
      <FieldError message={errors.termsAccepted} />
      <FieldError message={errors.account ?? errors.form} />

      <button
        type="submit"
        disabled={isSubmitting}
        className="h-11 rounded-md bg-neutral-950 px-4 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-400"
      >
        {isSubmitting
          ? t(dictionary, "auth.creatingAccount")
          : t(dictionary, "auth.createAccount")}
      </button>

      <p className="text-sm text-neutral-600">
        {t(dictionary, "auth.alreadyHaveAccount")}{" "}
        <Link href="/auth/login" className="font-medium text-neutral-950">
          {t(dictionary, "auth.login")}
        </Link>
      </p>
    </form>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-sm text-red-600">{message}</p>;
}
