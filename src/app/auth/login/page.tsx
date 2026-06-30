import { LoginForm } from "./LoginForm";

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
