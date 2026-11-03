import { Suspense } from "react";
import LoginForm from "./login-form";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="grid flex-1 place-items-center px-6 py-12">
          <p className="text-base text-muted" role="status">Cargando inicio de sesión…</p>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
