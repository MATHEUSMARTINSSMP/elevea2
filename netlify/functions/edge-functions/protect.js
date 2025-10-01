export default async (request, context) => {
  const url  = new URL(request.url);
  const path = url.pathname;

  // Só protege /admin/* e /client/*
  const isAdmin  = path.startsWith("/admin/");
  const isClient = path.startsWith("/client/");
  if (!isAdmin && !isClient) return context.next();

  // === helpers ===
  const textEnc = new TextEncoder();
  const b64url = (buf) =>
    btoa(String.fromCharCode(...new Uint8Array(buf)))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");

  const timingSafeEqual = (a, b) => {
    const A = textEnc.encode(a || "");
    const B = textEnc.encode(b || "");
    if (A.length !== B.length) return false;
    let ok = 0; for (let i = 0; i < A.length; i++) ok |= A[i] ^ B[i];
    return ok === 0;
  };

  const SIGN_SECRET =
    context.env?.ADMIN_DASH_TOKEN ||
    context.env?.ADMIN_TOKEN ||
    "";

  const sign = async (payload) => {
    const key = await crypto.subtle.importKey(
      "raw",
      textEnc.encode(SIGN_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const mac = await crypto.subtle.sign("HMAC", key, textEnc.encode(payload));
    return b64url(mac);
  };

  const parseToken = async (tkn) => {
    if (!tkn || !tkn.includes(".")) return null;
    const [payload, sig] = tkn.split(".");
    const expected = await sign(payload);
    if (!timingSafeEqual(expected, sig)) return null;
    try {
      const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
      if (!json.exp || Date.now() > json.exp) return null;
      return json;
    } catch { return null; }
  };

  // Lê cookie da requisição
  const rawCookie = request.headers.get("cookie") || "";
  const cookieMap = Object.fromEntries(
    rawCookie.split(/;\s*/).filter(Boolean).map(p => {
      const i = p.indexOf("="); return [p.slice(0, i), p.slice(i + 1)];
    })
  );
  const token = cookieMap["elevea_sess"] || "";

  // Função segura de redirect (evita o SPA 200 engolir o 302)
  const forceRedirect = (to) => {
    // 1) Tenta 302 direto
    const h = new Headers({
      Location: to,
      "Cache-Control": "no-store",
      "x-protect": "redir-302",
    });
    return new Response(null, { status: 302, headers: h });
  };

  // 2) fallback: HTML que redireciona (se algo reescrever o 302 para 200)
  const htmlRedirect = (to) => new Response(
    `<!doctype html><meta http-equiv="refresh" content="0;url=${to}"><script>location.replace(${JSON.stringify(to)})</script>`,
    {
      status: 401,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
        "x-protect": "redir-html",
      },
    }
  );

  const goLogin = () => {
    const to = `/login?next=${encodeURIComponent(url.pathname + url.search)}`;
    // tenta 302 e, se reescreverem, ainda fica o HTML de fallback
    return forceRedirect(to);
  };

  // Falta segredo? não dá para validar — manda para login
  if (!SIGN_SECRET) return goLogin();

  // Valida token
  const claims = await parseToken(token);
  if (!claims) {
    // Alguns ambientes podem reescrever o 302. Deixe o 302 por padrão:
    const res = goLogin();
    // E se você quiser o fallback HTML, troque pela linha abaixo:
    // return htmlRedirect(`/login?next=${encodeURIComponent(url.pathname + url.search)}`);
    return res;
  }

  // Autorização baseada em role
  const role = String(claims.role || "");
  if (isAdmin && role !== "admin") {
    return new Response("Forbidden", { status: 403, headers: { "x-protect": "forbidden" } });
  }
  if (isClient && !(role === "client" || role === "admin")) {
    return goLogin();
  }

  // Encaminha adicionando cabeçalhos úteis
  const newHeaders = new Headers(request.headers);
  newHeaders.set("x-user-email", claims.email || "");
  newHeaders.set("x-user-role", role);
  newHeaders.set("x-user-site", claims.siteSlug || "");
  newHeaders.set("x-protect", "ok");

  return context.next({ request: new Request(request, { headers: newHeaders }) });
};
