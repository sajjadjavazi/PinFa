import type { Metadata } from "next";
import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = {
  alternates: {
    canonical: "/auth/register",
  },
  description:
    "Create a PinFa account to save Pins, build Boards, and personalize your visual feed.",
  openGraph: {
    description:
      "Create a PinFa account to save Pins, build Boards, and personalize your visual feed.",
    title: "Create your PinFa account",
    type: "website",
    url: "/auth/register",
  },
  title: "Create Account",
};

export default function RegisterPage() {
  return (
    <main className="mx-auto grid min-h-screen w-full max-w-md content-center px-6 py-12">
      <div className="mb-8">
        <p className="text-sm font-medium uppercase text-neutral-500">
          PinFa
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-neutral-950">
          Create your account
        </h1>
      </div>
      <RegisterForm />
    </main>
  );
}
