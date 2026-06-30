import Link from "next/link";
import { redirect } from "next/navigation";
import { PinUploadForm } from "@/components/PinUploadForm";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUploadLimits } from "@/lib/upload-settings";

export default async function UploadPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  const [categories, uploadLimits] = await Promise.all([
    prisma.category.findMany({
      where: {
        status: "ACTIVE",
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
    getUploadLimits(),
  ]);

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-3xl content-start gap-8 px-6 py-10">
      <section className="flex flex-col gap-4 border-b border-neutral-200 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase text-neutral-500">PinFa</p>
          <h1 className="mt-3 text-3xl font-semibold text-neutral-950">
            Upload a Pin
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-600">
            Uploaded images are stored for review and stay out of public areas
            until moderation is added.
          </p>
        </div>
        <Link
          href="/profile"
          className="text-sm font-medium text-neutral-950 underline underline-offset-4"
        >
          Profile
        </Link>
      </section>

      <PinUploadForm
        categories={categories}
        maxImageSizeMb={uploadLimits.maxImageSizeMb}
        allowedMimeTypes={uploadLimits.allowedMimeTypes}
      />
    </main>
  );
}
