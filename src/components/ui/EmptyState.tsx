import Link from "next/link";

type EmptyStateProps = {
  actionHref?: string;
  actionLabel?: string;
  description?: string;
  title: string;
};

export function EmptyState({
  actionHref,
  actionLabel,
  description,
  title,
}: EmptyStateProps) {
  return (
    <div className="grid gap-3 rounded-md border border-dashed border-neutral-300 bg-white px-4 py-10 text-center">
      <h2 className="text-base font-semibold text-neutral-950">{title}</h2>
      {description ? (
        <p className="mx-auto max-w-md text-sm leading-6 text-neutral-500">
          {description}
        </p>
      ) : null}
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="mx-auto mt-1 grid h-10 place-items-center rounded-md bg-neutral-950 px-4 text-sm font-medium text-white transition hover:bg-neutral-800"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
