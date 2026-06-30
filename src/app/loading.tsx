import { LoadingState } from "@/components/ui/LoadingState";

export default function Loading() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-5 py-6 sm:px-6 lg:px-8">
      <LoadingState label="Loading PinFa" />
    </main>
  );
}
