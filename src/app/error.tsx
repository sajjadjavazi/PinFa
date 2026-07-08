"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto grid min-h-screen w-full max-w-3xl place-items-center px-6 py-10">
      <section className="grid gap-4 rounded-md border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm font-medium text-red-700">Something went wrong.</p>
        <h1 className="text-2xl font-semibold text-neutral-950">
          PinFa could not load this page.
        </h1>
        <p className="text-sm leading-6 text-neutral-600">
          Please try again. If this keeps happening, check the server logs for
          the request details.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mx-auto h-10 rounded-md bg-neutral-950 px-4 text-sm font-medium text-white transition hover:bg-neutral-800"
        >
          Try again
        </button>
      </section>
    </main>
  );
}
