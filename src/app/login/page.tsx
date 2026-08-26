"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

function LoginForm() {
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        setError("Mot de passe incorrect.");
        setBusy(false);
        return;
      }

      // Full navigation, not router.push: the middleware has to see the new
      // cookie on a fresh request before it will let the page through.
      window.location.href = params.get("next") ?? "/";
    } catch {
      setError("Connexion impossible. Vérifie ta connexion internet.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="w-full max-w-xs">
      <div className="mb-10 text-center">
        <h1 className="display text-5xl">
          H<span className="text-accent">Fit</span>
        </h1>
        <p className="mt-3 text-sm text-muted">Ton programme, ton suivi.</p>
      </div>

      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Mot de passe"
        autoFocus
        autoComplete="current-password"
        className="card w-full px-4 py-4 text-center font-medium outline-none placeholder:font-normal placeholder:text-faint focus:ring-2 focus:ring-accent/30"
      />

      {error && <p className="mt-3 text-center text-sm text-danger">{error}</p>}

      <button
        type="submit"
        disabled={busy || password.length === 0}
        className="mt-4 w-full rounded-2xl bg-ink py-4 font-semibold text-white transition active:scale-[0.98] disabled:opacity-30"
      >
        {busy ? "Connexion…" : "Entrer"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 pb-0">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
