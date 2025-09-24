// netlify/edge-functions/protect.js
// Protege apenas /admin/* e /client/*, sem nunca quebrar a página.
// Em caso de erro/falta de cookie, redireciona para /login?next=...

export default async (request, context) => {
  try {
    const url  = new URL(request.url);
    const path = url.pathname;

    // só vigia áreas privadas
    const isAdmin  = path.startsWith("/admin/");
    const isClient = path.startsWith("/client/");
    if (!isAdmin && !isClient) return context.next();

    // lê cookie (tolerante)
    const rawCookie = request.headers.get("cookie") || "";
    const cookie = Object.fromEntries(
      rawCookie
        .split(/;\s*/).filter(Boolean)
        .map((p) => {
          const i = p.indexOf("=");
          const k = i >= 0 ? p.slice(0, i) : p;
          const v = i >= 0 ? p.slice(i + 1) : "";
          return [k, v];
        })
    );

    const token = cookie["elevea_sess"] || "";

    // segredo opcional (se faltar, não vamos derrubar; só não validamos assinatura)
    const SIGN_SECRET =
      context.env?.ADMIN_DASH_TOKEN ||
      context.env?.ADMIN_TOKEN ||
      "";

    // utilidades
    const timingSafeEqual = (a, b) => {
      const A = new TextEncoder().encode(a || "");
      const B = new TextEncoder().encode(b || "");
      if (A.length !== B.length) return false;
      let ok = 0;
      for (let i = 0; i < A.length; i++) ok |= A[i] ^ B[i];
      return ok === 0;
    };

    const b64url = (buf) =>
      btoa(String.fromCharCode(...new Uint8Array(buf)))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");

    const sign = async (payload) => {
      if (!SIGN_SECRET) return ""; // sem segredo ⇒ sem validação
      const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(SIGN_SECRET),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      const mac = await crypto.subtle.sign(
        "HMAC",
        key,
        new TextEncoder().encode(payload)
      );
      return b64url(mac);
    };

    const parseToken = async (tkn) => {
      if (!tkn || !tkn.includes(".")) return null;
      const [payload, sig] = tkn.split(".");
      // valida assinatura somente se houver segredo
      if (SIGN_SECRET) {
        const expected = await sign(payload);
        if (!timingSafeEqual(expected, sig)) return null;
      }
      try {
        const json = JSON.parse(
          atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
        );
        if (json?.exp && Date.now() > json.exp) return null; // expirado
        return json;
      } catch {
        return null;
      }
    };

    const claims = await parseToken(token);
    const toLogin = () =>
      Response.redirect(
        `/login?next=${encodeURIComponent(url.pathname + url.search)}`,
        302
      );

    if (!claims) return toLogin();

    // autorização por role
    const role = String(claims.role || "");
    if (isAdmin && role !== "admin") return toLogin();
    if (isClient && !(role === "client" || role === "admin")) return toLogin();

    // encaminha com cabeçalhos úteis (sem quebrar)
    const headers = new Headers(request.headers);
    if (claims.email)    headers.set("x-user-email", claims.email);
    if (role)            headers.set("x-user-role", role);
    if (claims.siteSlug) headers.set("x-user-site", claims.siteSlug);

    return context.next({ request: new Request(request, { headers }) });
  } catch {
    // **NUNCA** derruba a página: segue o fluxo normal
    return context.next();
  }
};
