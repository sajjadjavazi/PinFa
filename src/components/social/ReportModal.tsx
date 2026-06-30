"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

type ReportTargetType = "PIN" | "USER" | "BOARD";

type ReportModalProps = {
  buttonLabel?: string;
  isAuthenticated: boolean;
  loginLabel?: string;
  targetId: string;
  targetType: ReportTargetType;
};

const reportReasons = [
  { value: "ADULT_CONTENT", label: "Adult content" },
  { value: "NUDITY", label: "Nudity" },
  { value: "SEXUAL_CONTENT", label: "Sexual content" },
  { value: "RACY_CONTENT", label: "Racy content" },
  { value: "VIOLENCE", label: "Violence" },
  { value: "MEDICAL_SENSITIVE", label: "Medical sensitive" },
  { value: "SPAM", label: "Spam" },
  { value: "HARASSMENT", label: "Harassment" },
  { value: "ILLEGAL_CONTENT", label: "Illegal content" },
  { value: "COPYRIGHT", label: "Copyright" },
  { value: "OTHER", label: "Other" },
];

export function ReportModal({
  buttonLabel = "Report",
  isAuthenticated,
  loginLabel = "Log in to report",
  targetId,
  targetType,
}: ReportModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAuthenticated) {
    return (
      <Link
        href="/auth/login"
        className="grid h-10 place-items-center rounded-md border border-neutral-300 px-4 text-sm font-medium text-neutral-800 transition hover:border-neutral-950"
      >
        {loginLabel}
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
          "Report failed.",
      );
      return;
    }

    setMessage("Report submitted.");
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
        className="h-10 rounded-md border border-neutral-300 px-4 text-sm font-medium text-neutral-800 transition hover:border-neutral-950"
      >
        {buttonLabel}
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 px-4">
          <div className="grid w-full max-w-md gap-5 rounded-md bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-neutral-950">
                  Report {targetType.toLowerCase()}
                </h2>
                <p className="mt-1 text-sm text-neutral-500">
                  Choose the closest reason.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="h-8 w-8 rounded-md border border-neutral-300 text-sm font-medium text-neutral-700 transition hover:border-neutral-950"
                aria-label="Close report dialog"
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
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="grid gap-4">
                <div className="grid gap-2">
                  <label htmlFor={`${targetType}-${targetId}-reason`} className="text-sm font-medium">
                    Reason
                  </label>
                  <select
                    id={`${targetType}-${targetId}-reason`}
                    name="reason"
                    className="h-11 rounded-md border border-neutral-300 bg-white px-3 outline-none transition focus:border-neutral-950"
                  >
                    {reportReasons.map((reason) => (
                      <option key={reason.value} value={reason.value}>
                        {reason.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-2">
                  <label htmlFor={`${targetType}-${targetId}-description`} className="text-sm font-medium">
                    Details
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
                    {isSubmitting ? "Submitting..." : "Submit Report"}
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="h-10 rounded-md border border-neutral-300 px-4 text-sm font-medium text-neutral-800 transition hover:border-neutral-950"
                  >
                    Cancel
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
