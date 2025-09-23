import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

type FetchJson<T> = (url: string, init?: RequestInit) => Promise<T>;
const fetchJson: FetchJson<any> = async (url, init) => {
  const r = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const text = await r.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!r.ok) throw Object.assign(new Error(data?.error || r.statusText), { status: r.status, data });
  return data;
};

function RequestResetForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<null | { ok: boolean; message: string }>(null);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!email.trim()) {
      setErr("Informe um e-mail válido.");
      return;
    }
    setBusy(true);
    try {
      // chama Netlify Function
      await fetchJson("/.netlify/functions/auth-reset", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setDone({ ok: true, message: "Se este e-mail existir, enviaremos um link para redefinição." });
    } catch (e: any) {
      setErr(e?.data?.error || e?.message || "Falha ao solicitar reset.");
    } finally {
      setBusy(false);
    }
  };

  if (done?.ok) {
    return (
      <div className="max-w-md mx-auto bg-card border border-border rounded-xl p-6 text-center">
        <h2 className="text-xl font-semibold mb-2">Verifique seu e-mail</h2>
        <p className="text-muted-foreground">{done.message}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="max-w-md mx-auto bg-card border border-border rounded-xl p-6">
      <h2 className="text-xl font-semibold mb-4">Reset de Senha</h2>
      <label className="block text-sm mb-1">E-mail</label>
      <input
        type="email"
        className="w-full border border-border rounded-lg px-3 h-11 bg-background"
        placeholder="seuemail@dominio.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      {err && <p className="text-sm text-red-600 mt-2">{err}</p>}
      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center justify-center h-11 px-4 rounded-lg text-white bg-black hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Enviando..." : "Enviar link"}
        </button>
        <a href="/login" className="h-11 px-4 rounded-lg border border-border inline-flex items-center">
          Voltar ao login
        </a>
      </div>
      <p className="text-xs text-muted-foreground mt-3">
        Você receberá um link para criar uma nova senha.
      </p>
    </form>
  );
}

function ConfirmResetForm({ token }: { token: string }) {
  const nav = useNavigate();
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (pwd.length < 8) return setErr("A senha deve ter ao menos 8 caracteres.");
    if (pwd !== pwd2) return setErr("As senhas não conferem.");
    setBusy(true);
    try {
      await fetchJson("/.netlify/functions/auth-reset-confirm", {
        method: "POST",
        body: JSON.stringify({ token, password: pwd }),
      });
      setOk(true);
      setTimeout(() => nav("/login"), 1200);
    } catch (e: any) {
      setErr(e?.data?.error || e?.message || "Falha ao redefinir senha.");
    } finally {
      setBusy(false);
    }
  };

  if (ok) {
    return (
      <div className="max-w-md mx-auto bg-card border border-border rounded-xl p-6 text-center">
        <h2 className="text-xl font-semibold mb-2">Senha alterada!</h2>
        <p className="text-muted-foreground">Redirecionando para o login…</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="max-w-md mx-auto bg-card border border-border rounded-xl p-6">
      <h2 className="text-xl font-semibold mb-4">Definir nova senha</h2>
      <label className="block text-sm mb-1">Nova senha</label>
      <input
        type="password"
        className="w-full border border-border rounded-lg px-3 h-11 bg-background"
        value={pwd}
        onChange={(e) => setPwd(e.target.value)}
        placeholder="••••••••"
      />
      <label className="block text-sm mb-1 mt-3">Confirmar senha</label>
      <input
        type="password"
        className="w-full border border-border rounded-lg px-3 h-11 bg-background"
        value={pwd2}
        onChange={(e) => setPwd2(e.target.value)}
        placeholder="••••••••"
      />
      {err && <p className="text-sm text-red-600 mt-2">{err}</p>}
      <button
        type="submit"
        disabled={busy}
        className="mt-4 inline-flex items-center justify-center h-11 px-4 rounded-lg text-white bg-black hover:opacity-90 disabled:opacity-50"
      >
        {busy ? "Salvando..." : "Salvar nova senha"}
      </button>
    </form>
  );
}

export default function ResetPage() {
  const { token } = useParams<{ token?: string }>();
  return (
    <div className="min-h-[70vh] grid place-items-center px-4 py-16">
      {token ? <ConfirmResetForm token={token} /> : <RequestResetForm />}
    </div>
  );
}
