"use client";

import { useEffect, useState } from "react";

// Defaults to the live SP VAS service. Override locally with
// NEXT_PUBLIC_VAS_API_URL=http://localhost:4001 when testing against a
// local `npm run dev` of sp-vas/service.
const API_BASE = process.env.NEXT_PUBLIC_VAS_API_URL ?? "https://vas.stackprimeconsulting.com.ng";

type Finding = { severity: "critical" | "high" | "medium" | "low" | "info"; message: string };
type ScanResult = {
  target: string;
  grade: string;
  score: number;
  findings: Finding[];
  usesRemaining: number;
  reportUrl: string;
};

type Status = "idle" | "loading" | "success" | "limit" | "error";

const SEVERITY_STYLES: Record<Finding["severity"], string> = {
  critical: "bg-red-50 text-red-700 border-red-200",
  high: "bg-orange-50 text-orange-700 border-orange-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  low: "bg-blue-50 text-blue-700 border-blue-200",
  info: "bg-gray-50 text-gray-600 border-gray-200",
};

/** A persistent, anonymous per-browser identifier — not personal data, just
 * enough to let the free-tier usage limit survive a page refresh. Generated
 * once and stored in localStorage; never sent anywhere except SP VAS itself.
 */
function getFingerprint(): string {
  const key = "sp_vas_fingerprint";
  try {
    let id = localStorage.getItem(key);
    if (!id) {
      id = typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `fp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(key, id);
    }
    return id;
  } catch {
    // localStorage unavailable (privacy mode, etc.) — fall back to a
    // session-only id rather than failing the form entirely.
    return `fp-session-${Math.random().toString(36).slice(2)}`;
  }
}

export default function VasScanForm() {
  const [target, setTarget] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [fingerprint, setFingerprint] = useState("");

  useEffect(() => {
    setFingerprint(getFingerprint());
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!consent || !target.trim()) return;

    setStatus("loading");
    setErrorMessage("");

    try {
      const res = await fetch(`${API_BASE}/api/vas/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: target.trim(), fingerprint, consent: true }),
      });

      const data = await res.json();

      if (res.status === 402) {
        setStatus("limit");
        return;
      }
      if (!res.ok) {
        setErrorMessage(data.error || "Something went wrong running that assessment.");
        setStatus("error");
        return;
      }

      setResult(data);
      setStatus("success");
    } catch {
      setErrorMessage("Couldn't reach the assessment service. Please try again in a moment.");
      setStatus("error");
    }
  }

  function handleReset() {
    setStatus("idle");
    setResult(null);
    setTarget("");
  }

  return (
    <div className="mx-auto max-w-2xl">
      {status !== "success" && status !== "limit" && (
        <form onSubmit={handleSubmit} className="rounded-lg border border-gray-100 bg-[#F7F8FA] p-8">
          <label htmlFor="vas-target" className="block text-sm font-medium text-ink">
            Website URL or IP address
          </label>
          <input
            id="vas-target"
            type="text"
            required
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="example.com"
            className="mt-1 w-full rounded-md border border-gray-200 px-4 py-3 text-sm focus:border-blue focus:outline-none"
          />

          <label className="mt-5 flex items-start gap-3 text-sm text-ink">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              required
              className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-gray-300"
            />
            <span>
              I confirm I am authorized to assess this domain or IP address. StackPrime runs only passive,
              non-intrusive checks — no exploitation or penetration testing.
            </span>
          </label>

          {status === "error" && (
            <p className="mt-4 text-sm text-red-600">{errorMessage}</p>
          )}

          <button
            type="submit"
            disabled={status === "loading" || !consent || !target.trim()}
            className="mt-6 w-full rounded-full bg-gold px-6 py-3 text-sm font-semibold text-navy hover:bg-gold/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === "loading" ? "Running assessment…" : "Run Free Assessment"}
          </button>

          <p className="mt-3 text-center text-xs text-muted">
            Free for your first 3 assessments. No account required.
          </p>
        </form>
      )}

      {status === "limit" && (
        <div className="rounded-lg bg-navy p-8 text-center text-white">
          <h3 className="font-serif text-xl font-semibold text-gold">Free assessments used</h3>
          <p className="mt-3 text-white/80">
            You&apos;ve used your 3 free SP VAS assessments. Upgrade to Premium for unlimited scans and deeper
            reporting, or talk to us about a full engagement.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <a
              href="/company/contact"
              className="inline-flex items-center justify-center rounded-full bg-gold px-6 py-3 text-sm font-semibold text-navy hover:bg-gold/90"
            >
              Ask About Premium
            </a>
            <button
              onClick={handleReset}
              className="inline-flex items-center justify-center rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {status === "success" && result && (
        <div className="rounded-lg border border-gray-100 bg-white p-8">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="text-sm font-semibold text-gold">Assessment complete</div>
              <h3 className="mt-1 font-serif text-xl font-semibold text-navy">{result.target}</h3>
            </div>
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-navy">
              <span className="font-serif text-2xl font-bold text-gold">{result.grade}</span>
            </div>
          </div>

          <p className="mt-2 text-sm text-muted">Score: {result.score}/100</p>

          <ul className="mt-6 space-y-2">
            {result.findings.map((f, i) => (
              <li
                key={i}
                className={`rounded-md border px-4 py-2 text-sm ${SEVERITY_STYLES[f.severity]}`}
              >
                <span className="mr-2 font-semibold uppercase">{f.severity}</span>
                {f.message}
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <a
              href={`${API_BASE}${result.reportUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-full bg-gold px-6 py-3 text-sm font-semibold text-navy hover:bg-gold/90"
            >
              Download PDF Report
            </a>
            <button
              onClick={handleReset}
              className="inline-flex items-center justify-center rounded-full border border-gray-200 px-6 py-3 text-sm font-semibold text-ink hover:bg-[#F7F8FA]"
            >
              Run Another
            </button>
          </div>

          <p className="mt-4 text-xs text-muted">{result.usesRemaining} free assessment(s) remaining.</p>
        </div>
      )}
    </div>
  );
}
