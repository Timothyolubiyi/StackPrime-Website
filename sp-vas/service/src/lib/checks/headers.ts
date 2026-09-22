export type HeadersResult = {
  ok: boolean;
  statusCode?: number;
  server?: string;
  poweredBy?: string;
  present: string[];
  missing: string[];
  cookieFlags?: { name: string; secure: boolean; httpOnly: boolean; sameSite: boolean }[];
  error?: string;
};

const EXPECTED_HEADERS = [
  "strict-transport-security",
  "content-security-policy",
  "x-frame-options",
  "x-content-type-options",
  "referrer-policy",
  "permissions-policy",
];

// Passive: a single standard GET request, exactly what a browser sends.
export async function checkHeaders(url: string, timeoutMs = 6000): Promise<HeadersResult> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "StackPrime-SPVAS/1.0 (+https://stackprimeconsulting.com/web-solutions)" },
    });
    clearTimeout(timer);

    const present: string[] = [];
    const missing: string[] = [];
    for (const h of EXPECTED_HEADERS) {
      if (res.headers.has(h)) present.push(h);
      else missing.push(h);
    }

    const setCookie = res.headers.get("set-cookie") ?? "";
    const cookieFlags = setCookie
      ? setCookie.split(/,(?=[^ ])/).map((c) => ({
          name: c.split("=")[0]?.trim() ?? "unknown",
          secure: /secure/i.test(c),
          httpOnly: /httponly/i.test(c),
          sameSite: /samesite/i.test(c),
        }))
      : [];

    return {
      ok: true,
      statusCode: res.status,
      server: res.headers.get("server") ?? undefined,
      poweredBy: res.headers.get("x-powered-by") ?? undefined,
      present,
      missing,
      cookieFlags,
    };
  } catch (err) {
    return { ok: false, present: [], missing: EXPECTED_HEADERS, error: (err as Error).message };
  }
}
