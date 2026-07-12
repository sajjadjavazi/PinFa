"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { getDictionary, t } from "@/lib/i18n/t";

type ReportTargetType = "PIN" | "USER" | "BOARD";

type ReportModalProps = {
  buttonAriaLabel?: string;
  buttonLabel?: string;
  buttonClassName?: string;
  isAuthenticated: boolean;
  locale?: Locale;
  loginClassName?: string;
  loginLabel?: string;
  targetId: string;
  targetType: ReportTargetType;
};

const reportReasons = [
  "ADULT_CONTENT",
  "NUDITY",
  "SEXUAL_CONTENT",
  "RACY_CONTENT",
  "VIOLENCE",
  "MEDICAL_SENSITIVE",
  "SPAM",
  "HARASSMENT",
  "ILLEGAL_CONTENT",
  "COPYRIGHT",
  "OTHER",
] as const;

export function ReportModal({
  buttonAriaLabel,
  buttonLabel,
  buttonClassName = "h-10 rounded-md border border-neutral-300 px-4 text-sm font-medium text-neutral-800 transition hover:border-neutral-950",
  isAuthenticated,
  locale = DEFAULT_LOCALE,
  loginClassName = "grid h-10 place-items-center rounded-md border border-neutral-300 px-4 text-sm font-medium text-neutral-800 transition hover:border-neutral-950",
  loginLabel,
  targetId,
  targetType,
}: ReportModalProps) {
  const dictionary = getDictionary(locale);
  const resolvedButtonLabel = buttonLabel ?? t(dictionary, "report.report");
  const resolvedLoginLabel = loginLabel ?? t(dictionary, "report.loginToReport");
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAuthenticated) {
    return (
      <Link
        href="/auth/login"
        className={loginClassName}
      >
        {resolvedLoginLabel}
      </Link>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/reports", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        targetType,
        targetId,
        reason: formData.get("reason"),
        description: formData.get("description"),
      }),
    });
    const result = await response.json();

    setIsSubmitting(false);

    if (!response.ok) {
      setError(
        result.errors?.report ??
          result.errors?.reason ??
          result.errors?.targetId ??
          result.errors?.auth ??
          t(dictionary, "report.failed"),
      );
      return;
    }

    setMessage(t(dictionary, "report.submitted"));
  }

  function closeModal() {
    setIsOpen(false);
    setError(null);
    setMessage(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={buttonAriaLabel ?? resolvedButtonLabel}
        className={buttonClassName}
      >
        {resolvedButtonLabel}
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 px-4">
          <div className="grid w-full max-w-md gap-5 rounded-md bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-neutral-950">
                  {t(dictionary, "report.reportTarget", {
                    target: t(dictionary, `enums.targetType.${targetType}`),
                  })}
                </h2>
                <p className="mt-1 text-sm text-neutral-500">
                  {t(dictionary, "report.subtitle")}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="h-8 w-8 rounded-md border border-neutral-300 text-sm font-medium text-neutral-700 transition hover:border-neutral-950"
                aria-label={t(dictionary, "report.closeDialog")}
              >
                X
              </button>
            </div>

            {message ? (
              <div className="grid gap-4">
                <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  {message}
                </p>
                <button
                  type="button"
                  onClick={closeModal}
                  className="h-10 rounded-md bg-neutral-950 px-4 text-sm font-medium text-white transition hover:bg-neutral-800"
                >
                  {t(dictionary, "common.done")}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="grid gap-4">
                <div className="grid gap-2">
                  <label htmlFor={`${targetType}-${targetId}-reason`} className="text-sm font-medium">
                    {t(dictionary, "report.reason")}
                  </label>
                  <select
                    id={`${targetType}-${targetId}-reason`}
                    name="reason"
                    defaultValue=""
                    required
                    className="h-11 rounded-md border border-neutral-300 bg-white px-3 outline-none transition focus:border-neutral-950"
                  >
                    <option value="" disabled>
                      {t(dictionary, "report.selectReason")}
                    </option>
                    {reportReasons.map((reason) => (
                      <option key={reason} value={reason}>
                        {t(dictionary, `reportReasons.${reason}`)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-2">
                  <label htmlFor={`${targetType}-${targetId}-description`} className="text-sm font-medium">
                    {t(dictionary, "report.details")}
                  </label>
                  <textarea
                    id={`${targetType}-${targetId}-description`}
                    name="description"
                    maxLength={1000}
                    rows={4}
                    className="resize-none rounded-md border border-neutral-300 px-3 py-2 outline-none transition focus:border-neutral-950"
                  />
                </div>

                {error ? <p className="text-sm text-red-600">{error}</p> : null}

                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-10 rounded-md bg-neutral-950 px-4 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-400"
                  >
                    {isSubmitting
                      ? t(dictionary, "report.submitting")
                      : t(dictionary, "report.submitReport")}
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="h-10 rounded-md border border-neutral-300 px-4 text-sm font-medium text-neutral-800 transition hover:border-neutral-950"
                  >
                    {t(dictionary, "common.cancel")}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
