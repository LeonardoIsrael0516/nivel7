import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { adminLogin } from "@/lib/admin-api";

export const Route = createFileRoute("/admin/login")({
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await adminLogin(email, password);
      await navigate({ to: "/admin" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md border border-border rounded-2xl p-6 bg-surface/40"
      >
        <h1 className="font-display text-3xl mb-2">Nivel7</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Acesso protegido ao painel operacional.
        </p>
        <label className="block text-sm mb-1">Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          className="w-full mb-4 px-3 py-2 rounded-lg bg-background border border-border"
          required
        />
        <label className="block text-sm mb-1">Senha</label>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          className="w-full mb-4 px-3 py-2 rounded-lg bg-background border border-border"
          required
        />
        {error && <div className="text-sm text-red-400 mb-3">{error}</div>}
        <button
          disabled={loading}
          className="w-full py-2 rounded-lg bg-gradient-blood text-primary-foreground"
        >
          {loading ? "Entrando..." : "Entrar no painel"}
        </button>
      </form>
    </div>
  );
}
