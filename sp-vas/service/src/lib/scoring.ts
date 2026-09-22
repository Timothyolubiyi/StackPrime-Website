import type { TlsResult } from "./checks/tls.js";
import type { HeadersResult } from "./checks/headers.js";
import type { DnsSecurityResult } from "./checks/dns-security.js";
import type { PortResult } from "./checks/ports.js";
import type { WellKnownResult } from "./checks/well-known.js";

export type ScanFindings = {
  tls: TlsResult;
  headers: HeadersResult;
  dnsSecurity: DnsSecurityResult;
  ports: PortResult[];
  wellKnown: WellKnownResult;
};

export type ScoredResult = {
  score: number; // 0-100
  grade: "A" | "B" | "C" | "D" | "F";
  findings: { severity: "critical" | "high" | "medium" | "low" | "info"; message: string }[];
};

const SENSITIVE_PORTS_THAT_SHOULD_BE_CLOSED = [21, 23, 3306, 3389, 5432, 6379];

export function scoreFindings(f: ScanFindings): ScoredResult {
  let score = 100;
  const findings: ScoredResult["findings"] = [];

  // TLS
  if (!f.tls.ok) {
    score -= 25;
    findings.push({ severity: "critical", message: "Could not establish a secure TLS connection." });
  } else {
    if (f.tls.selfSigned) {
      score -= 15;
      findings.push({ severity: "high", message: "Certificate appears to be self-signed." });
    }
    if (typeof f.tls.daysUntilExpiry === "number" && f.tls.daysUntilExpiry < 30) {
      score -= 10;
      findings.push({ severity: "medium", message: `TLS certificate expires in ${f.tls.daysUntilExpiry} days.` });
    }
    if (f.tls.protocol && /TLSv1(\.0|\.1)?$/.test(f.tls.protocol) && !/TLSv1\.[23]/.test(f.tls.protocol)) {
      score -= 15;
      findings.push({ severity: "high", message: `Outdated TLS protocol in use (${f.tls.protocol}).` });
    }
  }

  // Headers
  if (f.headers.ok) {
    const criticalMissing = ["strict-transport-security", "content-security-policy"];
    for (const h of f.headers.missing) {
      const isCritical = criticalMissing.includes(h);
      score -= isCritical ? 6 : 3;
      findings.push({
        severity: isCritical ? "medium" : "low",
        message: `Missing security header: ${h}`,
      });
    }
    for (const cookie of f.headers.cookieFlags ?? []) {
      if (!cookie.secure || !cookie.httpOnly) {
        score -= 4;
        findings.push({
          severity: "medium",
          message: `Cookie "${cookie.name}" missing Secure/HttpOnly flag.`,
        });
      }
    }
  } else {
    score -= 10;
    findings.push({ severity: "medium", message: "Could not retrieve HTTP response headers." });
  }

  // DNS
  if (!f.dnsSecurity.spf.present) {
    score -= 5;
    findings.push({ severity: "low", message: "No SPF record found — email spoofing risk." });
  }
  if (!f.dnsSecurity.dmarc.present) {
    score -= 5;
    findings.push({ severity: "low", message: "No DMARC record found — email spoofing risk." });
  } else if (f.dnsSecurity.dmarc.policy === "none") {
    score -= 3;
    findings.push({ severity: "info", message: "DMARC policy is set to \"none\" (monitor-only)." });
  }

  // Ports
  for (const p of f.ports) {
    if (p.open && SENSITIVE_PORTS_THAT_SHOULD_BE_CLOSED.includes(p.port)) {
      score -= 12;
      findings.push({
        severity: "high",
        message: `Port ${p.port} (${p.label}) is open to the public internet.`,
      });
    }
  }

  // Well-known
  if (!f.wellKnown.securityTxt) {
    score -= 2;
    findings.push({ severity: "info", message: "No /.well-known/security.txt found." });
  }

  score = Math.max(0, Math.min(100, score));
  const grade = score >= 90 ? "A" : score >= 75 ? "B" : score >= 60 ? "C" : score >= 40 ? "D" : "F";

  return { score, grade, findings };
}
