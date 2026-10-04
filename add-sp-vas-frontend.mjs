#!/usr/bin/env node
/**
 * add-sp-vas-frontend.mjs
 *
 * Adds the actual, working SP VAS frontend to the marketing site:
 *   - components/VasScanForm.tsx   the interactive scan form + results UI
 *   - app/web-solutions/sp-vas/page.tsx   the page that hosts it
 *   - app/web-solutions/page.tsx   updated: SP VAS card now links to the
 *     real tool instead of "Coming soon"; the dropped "Scan Files" card is
 *     removed; "Run Speed Test" renamed to "SP Fast Speed Test" (still
 *     coming soon — next in the build sequence)
 *
 * The form calls https://vas.stackprimeconsulting.com.ng by default. Override
 * for local testing with:
 *   NEXT_PUBLIC_VAS_API_URL=http://localhost:4001 npm run dev
 *
 * Usage (run from your marketing site's root folder):
 *   node add-sp-vas-frontend.mjs
 *   node add-sp-vas-frontend.mjs path/to/marketing-site
 *
 * Safe to run more than once — each step checks whether it's already
 * applied and skips if so.
 */

import fs from "node:fs";
import path from "node:path";

const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const p = (...segments) => path.join(root, ...segments);

function readText(file) {
  const raw = fs.readFileSync(file, "utf8");
  const crlf = raw.includes("\r\n");
  return { text: crlf ? raw.replace(/\r\n/g, "\n") : raw, crlf };
}
function writeText(file, text, crlf) {
  fs.writeFileSync(file, crlf ? text.replace(/\n/g, "\r\n") : text, "utf8");
}
function fail(message) {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

const summary = [];
const record = (status, message) => summary.push({ status, message });

const requiredFiles = [p("components"), p("app", "web-solutions", "page.tsx")];
for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    fail(
      `Could not find ${path.relative(root, file)} under ${root}\n` +
        "  Run this from your marketing site's root folder, or pass the folder path:\n" +
        "  node add-sp-vas-frontend.mjs path/to/marketing-site"
    );
  }
}

// ---------------------------------------------------------------------------
// Step 1: components/VasScanForm.tsx
// ---------------------------------------------------------------------------
const VAS_FORM_SOURCE = `"use client";

import { useEffect, useState } from "react";

// Defaults to the live SP VAS service. Override locally with
// NEXT_PUBLIC_VAS_API_URL=http://localhost:4001 when testing against a
// local `+ "`npm run dev`" + ` of sp-vas/service.
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
        : \`fp-\${Date.now()}-\${Math.random().toString(36).slice(2)}\`;
      localStorage.setItem(key, id);
    }
    return id;
  } catch {
    // localStorage unavailable (privacy mode, etc.) — fall back to a
    // session-only id rather than failing the form entirely.
    return \`fp-session-\${Math.random().toString(36).slice(2)}\`;
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
      const res = await fetch(\`\${API_BASE}/api/vas/scan\`, {
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
                className={\`rounded-md border px-4 py-2 text-sm \${SEVERITY_STYLES[f.severity]}\`}
              >
                <span className="mr-2 font-semibold uppercase">{f.severity}</span>
                {f.message}
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <a
              href={\`\${API_BASE}\${result.reportUrl}\`}
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
`;

{
  const file = p("components", "VasScanForm.tsx");
  if (fs.existsSync(file)) {
    record("skip", "components/VasScanForm.tsx: already exists");
  } else {
    fs.writeFileSync(file, VAS_FORM_SOURCE, "utf8");
    record("done", "components/VasScanForm.tsx: created");
  }
}

// ---------------------------------------------------------------------------
// Step 2: app/web-solutions/sp-vas/page.tsx
// ---------------------------------------------------------------------------
const SP_VAS_PAGE_SOURCE = `import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import Container from "@/components/Container";
import VasScanForm from "@/components/VasScanForm";

export const metadata: Metadata = {
  title: "SP VAS — Free Vulnerability Assessment",
  description:
    "Run a free, non-intrusive vulnerability assessment of any public website or IP address — TLS, security headers, DNS security, and port exposure, graded in minutes.",
};

export default function SpVasPage() {
  return (
    <>
      <PageHero
        eyebrow="Web Solutions"
        title="SP VAS — Vulnerability Assessment"
        description="A fast, non-intrusive security assessment of any public-facing website or IP address — free for your first 3 scans."
        image="/images/vapt-1.jpg"
        imageAlt="Vulnerability assessment dashboard"
      />
      <section className="py-16">
        <Container>
          <VasScanForm />
        </Container>
      </section>
    </>
  );
}
`;

{
  const file = p("app", "web-solutions", "sp-vas", "page.tsx");
  if (fs.existsSync(file)) {
    record("skip", "app/web-solutions/sp-vas/page.tsx: already exists");
  } else {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, SP_VAS_PAGE_SOURCE, "utf8");
    record("done", "app/web-solutions/sp-vas/page.tsx: created");
  }
}

// ---------------------------------------------------------------------------
// Step 3: app/web-solutions/page.tsx — update the tool cards
// ---------------------------------------------------------------------------
const WEB_SOLUTIONS_PAGE_SOURCE = `import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "@/components/PageHero";
import Container from "@/components/Container";

export const metadata: Metadata = {
  title: "Web Solutions",
  description:
    "Try StackPrime's browser-based tools — SP Fast Speed Test and SP VAS Vulnerability Assessment — free, no install required.",
};

const tools = [
  {
    name: "SP Fast Speed Test",
    description: "Check your network's real-world speed and latency — the same measurement engine behind SP Fast Enterprise.",
    status: "coming-soon" as const,
  },
  {
    name: "SP VAS — Vulnerability Assessment",
    description: "A fast, non-intrusive security assessment of any public-facing website or IP address.",
    status: "live" as const,
    href: "/web-solutions/sp-vas",
  },
];

export default function WebSolutionsPage() {
  return (
    <>
      <PageHero
        eyebrow="Web Solutions"
        title="Try before you commit"
        description="Browser-based tools, free to use — no install required. Three free uses before an upgrade prompt."
        image="/images/cybersecurity-2.jpg"
        imageAlt="Security operations center dashboard"
      />

      <section className="py-16">
        <Container>
          <div className="grid gap-6 md:grid-cols-2">
            {tools.map((tool) =>
              tool.status === "live" ? (
                <Link
                  key={tool.name}
                  href={tool.href}
                  className="group rounded-lg border border-gray-100 p-6 transition-shadow hover:shadow-md"
                >
                  <h3 className="font-serif text-lg font-semibold text-navy">{tool.name}</h3>
                  <p className="mt-2 text-sm text-muted">{tool.description}</p>
                  <span className="mt-4 inline-block rounded-full bg-gold px-4 py-2 text-xs font-semibold text-navy group-hover:bg-gold/90">
                    Run Free Assessment
                  </span>
                </Link>
              ) : (
                <div key={tool.name} className="rounded-lg border border-gray-100 p-6">
                  <h3 className="font-serif text-lg font-semibold text-navy">{tool.name}</h3>
                  <p className="mt-2 text-sm text-muted">{tool.description}</p>
                  <span className="mt-4 inline-block rounded-full bg-[#F7F8FA] px-4 py-2 text-xs font-semibold text-muted">
                    Coming soon
                  </span>
                </div>
              )
            )}
          </div>

          <div className="mt-10 rounded-lg bg-cream p-6 text-center italic text-[#5A4200]">
            Free tier: 3 uses before an upgrade prompt. Upgrade paths lead to a SaaS Platform subscription, or —
            for SP VAS — a qualified consulting engagement.
          </div>
        </Container>
      </section>
    </>
  );
}
`;

{
  const file = p("app", "web-solutions", "page.tsx");
  const { text, crlf } = readText(file);

  if (text.includes("SP VAS — Vulnerability Assessment")) {
    record("skip", "app/web-solutions/page.tsx: already updated");
  } else if (text.includes("Scan Files") || text.includes("tools.map")) {
    writeText(file, WEB_SOLUTIONS_PAGE_SOURCE, crlf);
    record("done", "app/web-solutions/page.tsx: SP VAS card now live, Scan Files removed, Speed Test renamed");
  } else {
    fail(
      "app/web-solutions/page.tsx doesn't look like the expected original file.\n" +
        "  It may have been edited since this script was written. Nothing has been changed —\n" +
        "  update this page by hand: make the SP VAS card link to /web-solutions/sp-vas,\n" +
        "  remove the Scan Files card, and rename \"Run Speed Test\" to \"SP Fast Speed Test\"."
    );
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
console.log("\nStackPrime: wire up the real SP VAS frontend\n");
for (const { status, message } of summary) {
  console.log(`  ${status === "done" ? "✓" : "·"} ${message}${status === "skip" ? "  (skipped)" : ""}`);
}
console.log("\nNext steps:");
console.log("  1. git diff                        (review exactly what changed)");
console.log("  2. npm run dev                     (then open /web-solutions and /web-solutions/sp-vas)");
console.log("  3. Try a real scan against a domain you're authorized to test, confirm the PDF downloads");
console.log("  4. To test locally against sp-vas/service instead of production:");
console.log("     NEXT_PUBLIC_VAS_API_URL=http://localhost:4001 npm run dev\n");
