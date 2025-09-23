// src/pages/reset/index.tsx
import React, { useMemo, useState } from "react";

function useQuery() {
  return useMemo(() => new URLSearchParams(window.location.search), []);
}

export default function ResetPage() {
  const q = useQuery();
  const initialEmail = (q.get("email") || q.get("e") || "").toLowerCase();
  const initialToken = q.get("token") || q.get("t") || "";

  const [step, setStep] = useState<"request" | "confirm">(
    initialToken && initialEmail ? "confirm" : "request"
  );

  // REQUEST (manda e-mail)
  const [email, setEmail] = useState(initialEmail);
  const [reqLoading, setReqLoading] = useState(false);
  const [reqMsg, setReqMsg] = useState<string | null>(null);
  const [reqErr, setReqErr] = useState<string | null>(null);

  // CONFIRM (define senha)
  const [confirmEmail, setConfirmEmail] = useState(initialEmail);
  const [token, setToken] = useState(initialToken);
  const [password, setPassword] = useState("");
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmMsg, setConfirmMsg] = useState<string | null>(null);
  const [confirmErr, setConfirmErr] = useState<string | null>(null);

  const explainError = (code?: string | null) => {
    switch (code) {
      case "missing_email":
      case "missing_email_or_token":
        return "Informe seu e-mail (e token quando aplicável).";
      case "user_not_found":
        return "Se existir uma conta com este e-mail, enviaremos o link. Verifique sua caixa de entrada.";
      case "invalid_token":
        return "Token inválido ou expirado. Gere um novo link de redefinição.";
      case "weak_password":
        return "A nova senha deve ter pelo menos 6 caracteres.";
      default:
        return "Não foi possível completar a operação. Tente novamente.";
    }
  };

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setReqLoading(true);
    setReqErr(null);
    setReqMsg(null);

    try {
      const r = await fetch("/.netlify/functions/auth-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const out = await r.json();
      if (out?.ok) {
        setReqMsg(
          "Se existir uma conta com este e-mail, enviamos um link de redefinição. Verifique sua caixa de entrada e spam."
        );
      } else {
        setReqErr(explainError(out?.error));
      }
    } catch (_) {
      setReqErr("Falha de rede. Tente novamente.");
    } finally {
      setReqLoading(false);
    }
  }

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    setConfirmLoading(true);
    setConfirmErr(null);
    setConfirmMsg(null);

    try {
      const r = await fetch("/.netlify/functions/auth-reset-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: confirmEmail,
          token,
          password,
        }),
      });
      const out = await r.json();
      if (out?.ok) {
        setConfirmMsg("Senha alterada com sucesso. Você já pode fazer login.");
        // opcional: redirecionar depois de alguns segundos
        // setTimeout(() => (window.location.href = "/login"), 1200);
      } else {
        setConfirmErr(explainError(out?.error));
      }
    } catch (_) {
      setConfirmErr("Falha de rede. Tente novamente.");
    } finally {
      setConfirmLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 16 }}>
      <div
        style={{
          width: 420,
          maxWidth: "95vw",
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 16,
          boxShadow: "0 8px 24px rgba(0,0,0,.06)",
          padding: 24,
        }}
      >
        {step === "request" ? (
          <>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Redefinir senha</h1>
            <p style={{ color: "#6b7280", marginBottom: 16 }}>
              Informe seu e-mail para enviarmos um link de redefinição.
            </p>
            <form onSubmit={handleRequest}>
              <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>E-mail</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@exemplo.com"
                style={{
                  width: "100%",
                  height: 40,
                  borderRadius: 10,
                  border: "1px solid #d1d5db",
                  padding: "0 12px",
                  marginBottom: 12,
                }}
              />
              <button
                disabled={reqLoading}
                style={{
                  width: "100%",
                  height: 42,
                  borderRadius: 10,
                  border: "0",
                  background: "black",
                  color: "white",
                  fontWeight: 600,
                  cursor: "pointer",
                  opacity: reqLoading ? 0.7 : 1,
                }}
              >
                {reqLoading ? "Enviando..." : "Enviar link"}
              </button>
            </form>
            {reqMsg && <p style={{ color: "#065f46", marginTop: 12 }}>{reqMsg}</p>}
            {reqErr && <p style={{ color: "#b91c1c", marginTop: 12 }}>{reqErr}</p>}

            <hr style={{ margin: "16px 0", borderColor: "#eee" }} />

            <p style={{ fontSize: 13, color: "#6b7280" }}>
              Já tem <b>token</b>?{" "}
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setStep("confirm");
                }}
              >
                Definir nova senha
              </a>
            </p>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Definir nova senha</h1>
            <p style={{ color: "#6b7280", marginBottom: 16 }}>
              Cole o e-mail e o token recebidos e informe a nova senha.
            </p>
            <form onSubmit={handleConfirm}>
              <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>E-mail</label>
              <input
                type="email"
                required
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                placeholder="seu@exemplo.com"
                style={{
                  width: "100%",
                  height: 40,
                  borderRadius: 10,
                  border: "1px solid #d1d5db",
                  padding: "0 12px",
                  marginBottom: 12,
                }}
              />

              <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>Token</label>
              <input
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="xxxx-xxxx-xxxx..."
                style={{
                  width: "100%",
                  height: 40,
                  borderRadius: 10,
                  border: "1px solid #d1d5db",
                  padding: "0 12px",
                  marginBottom: 12,
                }}
              />

              <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>Nova senha</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="mínimo 6 caracteres"
                style={{
                  width: "100%",
                  height: 40,
                  borderRadius: 10,
                  border: "1px solid #d1d5db",
                  padding: "0 12px",
                  marginBottom: 12,
                }}
              />

              <button
                disabled={confirmLoading}
                style={{
                  width: "100%",
                  height: 42,
                  borderRadius: 10,
                  border: "0",
                  background: "black",
                  color: "white",
                  fontWeight: 600,
                  cursor: "pointer",
                  opacity: confirmLoading ? 0.7 : 1,
                }}
              >
                {confirmLoading ? "Salvando..." : "Salvar nova senha"}
              </button>
            </form>

            {confirmMsg && <p style={{ color: "#065f46", marginTop: 12 }}>{confirmMsg}</p>}
            {confirmErr && <p style={{ color: "#b91c1c", marginTop: 12 }}>{confirmErr}</p>}

            <hr style={{ margin: "16px 0", borderColor: "#eee" }} />
            <p style={{ fontSize: 13, color: "#6b7280" }}>
              Precisa pedir o link? <a href="/reset">Clique aqui</a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
