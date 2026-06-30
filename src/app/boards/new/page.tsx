import { redirect } from "next/navigation";
import { CreateBoardForm } from "@/components/boards/CreateBoardForm";
import { getCurrentUser } from "@/lib/auth";

export default async function NewBoardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-2xl content-start gap-8 px-6 py-10">
      <section>
        <p className="text-sm font-medium text-neutral-500">Boards</p>
        <h1 className="mt-2 text-3xl font-semibold text-neutral-950">
          Create Board
        </h1>
        <p className="mt-3 leading-7 text-neutral-600">
          Collect published Pins into a public mood board.
        </p>
      </section>

      <CreateBoardForm />
    </main>
  );
}
