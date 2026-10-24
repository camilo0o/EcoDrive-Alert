import { Suspense } from "react";
import LoginForm from "./login-form";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex w-full max-w-md flex-1 items-center justify-center px-6 py-12">
          <p role="status">Cargando inicio de sesión...</p>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
