export default function NotificationsLoading() {
  return (
    <main className="mx-auto grid min-h-screen w-full max-w-4xl gap-8 px-6 py-10">
      <div className="h-12 w-64 animate-pulse rounded-md bg-neutral-200" />
      <div className="grid gap-3">
        <div className="h-28 animate-pulse rounded-md bg-white ring-1 ring-neutral-200" />
        <div className="h-28 animate-pulse rounded-md bg-white ring-1 ring-neutral-200" />
        <div className="h-28 animate-pulse rounded-md bg-white ring-1 ring-neutral-200" />
      </div>
    </main>
  );
}
