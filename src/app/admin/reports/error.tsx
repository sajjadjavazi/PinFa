"use client";

export default function AdminReportsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-md bg-white px-4 py-8 text-center shadow-sm ring-1 ring-neutral-200">
      <h2 className="text-lg font-semibold text-neutral-950">
        Reports could not be loaded
      </h2>
      <p className="mt-2 text-sm text-neutral-500">
        Try again, or check the server logs if the problem continues.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 h-10 rounded-md bg-neutral-950 px-4 text-sm font-medium text-white transition hover:bg-neutral-800"
      >
        Retry
      </button>
    </div>
  );
}
