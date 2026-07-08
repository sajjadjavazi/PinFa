import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  alternates: {
    canonical: "/auth/login",
  },
  description: "Log in to PinFa to save Pins, manage Boards, and view notifications.",
  openGraph: {
    description:
      "Log in to PinFa to save Pins, manage Boards, and view notifications.",
    title: "Log in to PinFa",
    type: "website",
    url: "/auth/login",
  },
  title: "Log In",
};

export default function LoginPage() {
  return (
    <main className="mx-auto grid min-h-screen w-full max-w-md content-center px-6 py-12">
      <div className="mb-8">
        <p className="text-sm font-medium uppercase text-neutral-500">
          PinFa
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-neutral-950">
          Log in
        </h1>
      </div>
      <LoginForm />
    </main>
  );
}
