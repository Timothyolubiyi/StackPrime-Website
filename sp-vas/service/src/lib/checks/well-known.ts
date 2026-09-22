export type WellKnownResult = {
  robotsTxt: boolean;
  securityTxt: boolean;
};

export async function checkWellKnown(baseUrl: string, timeoutMs = 4000): Promise<WellKnownResult> {
  const check = async (path: string) => {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(new URL(path, baseUrl).toString(), {
        method: "GET",
        signal: controller.signal,
        headers: { "User-Agent": "StackPrime-SPVAS/1.0 (+https://stackprimeconsulting.com/web-solutions)" },
      });
      clearTimeout(timer);
      return res.ok;
    } catch {
      return false;
    }
  };

  const [robotsTxt, securityTxt] = await Promise.all([
    check("/robots.txt"),
    check("/.well-known/security.txt"),
  ]);

  return { robotsTxt, securityTxt };
}
