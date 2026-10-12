"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Phase = "idle" | "starting" | "latency" | "download" | "upload" | "submitting" | "complete" | "error" | "limit";
type TestResult = {
  grade: "Excellent" | "Good" | "Fair" | "Poor" | string;
  downloadMbps: number;
  uploadMbps: number;
  latencyMs: number;
  usesRemaining?: number;
  reportUrl?: string;
};
type ApiError = { error?: string; message?: string };

const DOWNLOAD_BYTES = 10 * 1024 * 1024; // Two fixed 10 MiB transfers.
const UPLOAD_BYTES = 5 * 1024 * 1024; // Two fixed 5 MiB JSON payloads.
const ENTERPRISE_URL = "mailto:info@stackprimeconsulting.com.ng?subject=SP%20Fast%20Enterprise%20Enquiry";
const API_BASE = (process.env.NEXT_PUBLIC_SP_FAST_SPEEDTEST_API_URL || "https://speedtest.stackprimeconsulting.com.ng").replace(/\/$/, "");

function formatMbps(value: number) {
  if (!Number.isFinite(value)) return "—";
  return value >= 100 ? value.toFixed(0) : value.toFixed(1);
}

function gradeDescription(grade: string) {
  switch (grade) {
    case "Excellent": return "Your download speed is excellent for demanding online activities.";
    case "Good": return "Your download speed should handle most everyday online activities comfortably.";
    case "Fair": return "Your connection may handle everyday tasks, though demanding activities could feel slower.";
    default: return "Your download speed is limited. Consider checking your Wi-Fi, router or ISP plan.";
  }
}

function gradeClass(grade: string) {
  switch (grade) {
    case "Excellent": return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "Good": return "border-sky-200 bg-sky-50 text-sky-800";
    case "Fair": return "border-amber-200 bg-amber-50 text-amber-800";
    default: return "border-rose-200 bg-rose-50 text-rose-800";
  }
}

async function readApiError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as ApiError;
    return data.message || data.error || `Request failed (${response.status}).`;
  } catch {
    return `Request failed (${response.status}). Please try again.`;
  }
}

async function getOrCreateFingerprint(): Promise<string> {
  const key = "sp-fast-speedtest-fingerprint-v1";
  try {
    const saved = window.localStorage.getItem(key);
    if (saved) return saved;
    const generated = window.crypto?.randomUUID?.() || `sp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(key, generated);
    return generated;
  } catch {
    // The backend also applies IP-based limits when storage is unavailable.
    return window.crypto?.randomUUID?.() || `sp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

async function measureLatency(): Promise<number> {
  const samples: number[] = [];
  for (let i = 0; i < 3; i += 1) {
    const started = performance.now();
    const response = await fetch(`${API_BASE}/api/health?probe=${Date.now()}-${i}`, {
      method: "GET",
      cache: "no-store",
    });
    if (!response.ok) throw new Error(await readApiError(response));
    await response.arrayBuffer();
    samples.push(performance.now() - started);
  }
  samples.sort((a, b) => a - b);
  return Number(samples[1].toFixed(1));
}

async function measureDownload(token: string): Promise<number> {
  const started = performance.now();
  const response = await fetch(
    `${API_BASE}/api/speedtest/download?token=${encodeURIComponent(token)}&bytes=${DOWNLOAD_BYTES}`,
    { cache: "no-store" },
  );
  if (!response.ok) throw new Error(await readApiError(response));
  const body = await response.arrayBuffer();
  const elapsedSeconds = Math.max((performance.now() - started) / 1000, 0.001);
  return (body.byteLength * 8) / elapsedSeconds / 1_000_000;
}

async function measureUpload(token: string): Promise<number> {
  // The route's Fastify JSON parser requires JSON. A fixed 5 MiB string is
  // sufficient for timing and stays below the route's 8 MiB request cap.
  const payload = JSON.stringify({ payload: "x".repeat(UPLOAD_BYTES), sample: "sp-fast-speedtest" });
  const payloadBytes = new TextEncoder().encode(payload).byteLength;
  const started = performance.now();
  const response = await fetch(`${API_BASE}/api/speedtest/upload?token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    cache: "no-store",
  });
  if (!response.ok) throw new Error(await readApiError(response));
  await response.json();
  const elapsedSeconds = Math.max((performance.now() - started) / 1000, 0.001);
  return (payloadBytes * 8) / elapsedSeconds / 1_000_000;
}

export default function SpeedTestClient() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Ready when you are.");
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState("");
  const [usesRemaining, setUsesRemaining] = useState<number | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => setIsMounted(true), []);

  const isRunning = useMemo(
    () => ["starting", "latency", "download", "upload", "submitting"].includes(phase),
    [phase],
  );

  const runTest = useCallback(async () => {
    if (isRunning) return;
    setResult(null);
    setError("");
    setProgress(2);
    setPhase("starting");
    setStatus("Preparing a secure test session…");

    try {
      const fingerprint = await getOrCreateFingerprint();
      const startResponse = await fetch(`${API_BASE}/api/speedtest/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fingerprint }),
        cache: "no-store",
      });

      if (startResponse.status === 402) {
        setPhase("limit");
        setStatus("Your free tests have been used.");
        setError(await readApiError(startResponse));
        setProgress(100);
        return;
      }
      if (!startResponse.ok) throw new Error(await readApiError(startResponse));
      const session = (await startResponse.json()) as { token: string; usesRemaining?: number };
      if (!session.token) throw new Error("The speed test service did not return a session token.");
      if (typeof session.usesRemaining === "number") setUsesRemaining(session.usesRemaining);

      setPhase("latency");
      setStatus("Measuring latency…");
      setProgress(12);
      const latencyMs = await measureLatency();

      setPhase("download");
      setStatus("Measuring download speed (1 of 2)…");
      setProgress(22);
      const download1 = await measureDownload(session.token);
      setStatus("Measuring download speed (2 of 2)…");
      setProgress(39);
      const download2 = await measureDownload(session.token);
      const downloadMbps = (download1 + download2) / 2;

      setPhase("upload");
      setStatus("Measuring upload speed (1 of 2)…");
      setProgress(57);
      const upload1 = await measureUpload(session.token);
      setStatus("Measuring upload speed (2 of 2)…");
      setProgress(74);
      const upload2 = await measureUpload(session.token);
      const uploadMbps = (upload1 + upload2) / 2;

      setPhase("submitting");
      setStatus("Calculating your result and preparing your PDF report…");
      setProgress(88);
      const submitResponse = await fetch(`${API_BASE}/api/speedtest/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: session.token,
          downloadMbps: Number(downloadMbps.toFixed(2)),
          uploadMbps: Number(uploadMbps.toFixed(2)),
          latencyMs: Number(latencyMs.toFixed(1)),
        }),
        cache: "no-store",
      });
      if (!submitResponse.ok) throw new Error(await readApiError(submitResponse));
      const data = (await submitResponse.json()) as TestResult;
      setResult(data);
      if (typeof data.usesRemaining === "number") setUsesRemaining(data.usesRemaining);
      setProgress(100);
      setPhase("complete");
      setStatus("Speed test complete.");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Something went wrong while running the speed test.";
      setError(message);
      setPhase("error");
      setStatus("The test could not be completed.");
      setProgress(0);
    }
  }, [isRunning]);

  const reportHref = result?.reportUrl
    ? result.reportUrl.startsWith("http")
      ? result.reportUrl
      : `${API_BASE}${result.reportUrl.startsWith("/") ? "" : "/"}${result.reportUrl}`
    : "";

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="relative isolate overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/50 via-slate-950 to-slate-950" />
        <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
          <a href="/" className="text-sm font-extrabold tracking-[0.16em] text-white sm:text-base" aria-label="StackPrime Consulting home">
            STACK<span className="text-cyan-400">PRIME</span>
            <span className="ml-2 hidden text-xs font-medium tracking-normal text-slate-400 sm:inline">CONSULTING</span>
          </a>
          <a href="/" className="text-sm text-slate-300 transition hover:text-white">Main website ↗</a>
        </header>

        <section className="mx-auto grid w-full max-w-6xl gap-10 px-5 pb-16 pt-8 sm:px-8 md:grid-cols-[1.05fr_0.95fr] md:items-center md:pb-24 md:pt-16">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-cyan-200">
              <span className="h-2 w-2 rounded-full bg-cyan-300" /> SP FAST SPEED TEST
            </div>
            <h1 className="max-w-2xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Know your internet speed. <span className="text-cyan-300">Make every connection count.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
              Check your download speed, upload speed and latency with a quick, straightforward test from StackPrime Consulting.
            </p>
            <div className="mt-8 grid max-w-xl grid-cols-3 gap-3">
              {[
                ["Download", "How fast data arrives"],
                ["Upload", "How fast data is sent"],
                ["Latency", "How quickly you respond"],
              ].map(([label, description]) => (
                <div key={label} className="rounded-xl border border-white/10 bg-white/[0.04] p-3 sm:p-4">
                  <div className="text-sm font-semibold text-white sm:text-base">{label}</div>
                  <div className="mt-1 text-xs leading-5 text-slate-400">{description}</div>
                </div>
              ))}
            </div>
            <p className="mt-6 max-w-xl text-xs leading-5 text-slate-500">
              For a fair reading, pause large downloads, streaming and VPN traffic where possible. Results can vary with Wi-Fi signal, device load and network congestion.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-black/30 backdrop-blur sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">Internet speed test</h2>
                <p className="mt-1 text-sm text-slate-400">One test. Three useful metrics.</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-right">
                <div className="text-[10px] uppercase tracking-wider text-slate-500">Free tests</div>
                <div className="mt-0.5 text-sm font-bold text-white">{isMounted && usesRemaining !== null ? `${usesRemaining} left` : "Up to 3"}</div>
              </div>
            </div>

            <div className="my-7 flex flex-col items-center rounded-2xl border border-cyan-400/15 bg-slate-950/70 px-4 py-7 text-center">
              <div className="relative flex h-44 w-44 items-center justify-center rounded-full border-[8px] border-slate-800 sm:h-52 sm:w-52">
                <div className="absolute inset-0 rounded-full border-[8px] border-transparent border-t-cyan-400" style={{ transform: `rotate(${Math.max(0, Math.min(progress, 100)) * 3.6}deg)`, opacity: isRunning ? 1 : 0.45, transition: "transform 300ms ease" }} />
                <div className="px-4">
                  {result ? (
                    <>
                      <div className="text-4xl font-bold tracking-tight">{formatMbps(result.downloadMbps)}</div>
                      <div className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Mbps download</div>
                    </>
                  ) : (
                    <>
                      <div className="text-4xl font-bold tracking-tight">{isRunning ? `${progress}%` : "SP"}</div>
                      <div className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{isRunning ? "Testing" : "Ready"}</div>
                    </>
                  )}
                </div>
              </div>
              <p aria-live="polite" className="mt-5 min-h-5 text-sm text-slate-300">{status}</p>
              <div className="mt-4 h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-300 transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
              <button
                type="button"
                onClick={runTest}
                disabled={isRunning || phase === "limit"}
                className="mt-6 w-full max-w-sm rounded-xl bg-cyan-300 px-5 py-3.5 text-sm font-extrabold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isRunning ? "Testing your connection…" : phase === "limit" ? "Free limit reached" : result ? "Run another test" : "Start speed test"}
              </button>
              <p className="mt-3 text-center text-[11px] leading-5 text-slate-500">Fixed transfer sizes help keep the test lightweight and protect shared network resources.</p>
            </div>

            {error && (
              <div role="alert" className={`rounded-xl border p-4 text-sm leading-6 ${phase === "limit" ? "border-amber-400/30 bg-amber-400/10 text-amber-100" : "border-rose-400/30 bg-rose-400/10 text-rose-100"}`}>
                <p>{error}</p>
                {phase === "limit" && (
                  <a href={ENTERPRISE_URL} className="mt-3 inline-flex items-center rounded-lg bg-white px-4 py-2 font-bold text-slate-950 hover:bg-slate-200">
                    Ask about SP Fast Enterprise ↗
                  </a>
                )}
              </div>
            )}

            {result && (
              <div className="mt-5 space-y-4" aria-live="polite">
                <div className={`rounded-xl border p-4 ${gradeClass(result.grade)}`}>
                  <div className="text-xs font-bold uppercase tracking-[0.16em]">Your connection grade</div>
                  <div className="mt-1 text-2xl font-extrabold">{result.grade}</div>
                  <p className="mt-1 text-sm leading-5">{gradeDescription(result.grade)}</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Metric label="Download" value={formatMbps(result.downloadMbps)} unit="Mbps" />
                  <Metric label="Upload" value={formatMbps(result.uploadMbps)} unit="Mbps" />
                  <Metric label="Latency" value={result.latencyMs.toFixed(1)} unit="ms" />
                </div>
                {reportHref && (
                  <a href={reportHref} target="_blank" rel="noreferrer" className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10">
                    Download PDF report <span aria-hidden="true">↓</span>
                  </a>
                )}
                {typeof result.usesRemaining === "number" && result.usesRemaining <= 1 && (
                  <p className="text-xs leading-5 text-slate-400">You have {result.usesRemaining} free test{result.usesRemaining === 1 ? "" : "s"} remaining. Need ongoing or multi-region monitoring? <a className="font-semibold text-cyan-300 underline underline-offset-2" href={ENTERPRISE_URL}>Explore SP Fast Enterprise</a>.</p>
                )}
              </div>
            )}
          </div>
        </section>

        <footer className="border-t border-white/10 px-5 py-6 text-center text-xs text-slate-500 sm:px-8">
          <p>© {new Date().getFullYear()} StackPrime Consulting Ltd. Secure. Scalable. Connected.</p>
          <p className="mt-1">SP Fast Speed Test provides an indicative snapshot; it is not a guarantee of your ISP’s advertised performance.</p>
        </footer>
      </div>
    </main>
  );
}

function Metric({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-center">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-2 text-xl font-bold text-white">{value}</div>
      <div className="text-[11px] text-slate-400">{unit}</div>
    </div>
  );
}
