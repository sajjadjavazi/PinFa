"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary, t } from "@/lib/i18n/t";

type ApiErrors = Record<string, string>;

export function LoginForm({ locale }: { locale: Locale }) {
  const router = useRouter();
  const dictionary = getDictionary(locale);
  const [errors, setErrors] = useState<ApiErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        identifier: formData.get("identifier"),
        password: formData.get("password"),
      }),
    });
    const result = await response.json();

    setIsSubmitting(false);

    if (!response.ok) {
      setErrors(result.errors ?? { form: t(dictionary, "auth.loginFailed") });
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5">
      <div className="grid gap-2">
        <label htmlFor="identifier" className="text-sm font-medium">
          {t(dictionary, "auth.identifier")}
        </label>
        <input
          id="identifier"
          name="identifier"
          autoComplete="username"
          required
          dir="auto"
          className="h-11 rounded-md border border-neutral-300 px-3 outline-none transition focus:border-neutral-950"
        />
        <FieldError message={errors.identifier} />
      </div>

      <div className="grid gap-2">
        <label htmlFor="password" className="text-sm font-medium">
          {t(dictionary, "auth.password")}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          dir="ltr"
          className="h-11 rounded-md border border-neutral-300 px-3 outline-none transition focus:border-neutral-950"
        />
        <FieldError message={errors.password} />
      </div>

      <FieldError
        message={errors.credentials ?? errors.account ?? errors.form}
      />

      <button
        type="submit"
        disabled={isSubmitting}
        className="h-11 rounded-md bg-neutral-950 px-4 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-400"
      >
        {isSubmitting ? t(dictionary, "auth.loggingIn") : t(dictionary, "auth.login")}
      </button>

      <p className="text-sm text-neutral-600">
        {t(dictionary, "auth.newToPinfa")}{" "}
        <Link href="/auth/register" className="font-medium text-neutral-950">
          {t(dictionary, "auth.createAccount")}
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
