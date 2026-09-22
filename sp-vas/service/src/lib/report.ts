import PDFDocument from "pdfkit";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ScanFindings, ScoredResult } from "./scoring.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = path.join(__dirname, "..", "..", "assets", "logo-icon.png");

const NAVY = "#001236";
const GOLD = "#D89A00";
const BLUE = "#0072D6";
const MUTED = "#6B7280";

const SEVERITY_COLOR: Record<string, string> = {
  critical: "#B91C1C",
  high: "#D97706",
  medium: "#D89A00",
  low: "#0072D6",
  info: "#6B7280",
};

// NOTE: per standing instruction, Web Solutions / SaaS report documents do
// NOT carry RC 9676973 — that's reserved for official company documents.
// This report deliberately omits it.
export function generateVasReportPdf(params: {
  target: string;
  scannedAt: Date;
  findings: ScanFindings;
  result: ScoredResult;
  outputPath: string;
}) {
  const { target, scannedAt, findings, result, outputPath } = params;
  const doc = new PDFDocument({ size: "A4", margin: 56 });
  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  // --- Watermark (diagonal, behind content) ---
  doc.save();
  doc.rotate(-45, { origin: [297, 421] });
  doc.fontSize(60).fillColor(NAVY).opacity(0.06);
  doc.text("STACKPRIME  ·  FREE ASSESSMENT  ·  NOT FOR ENGAGEMENT USE", -100, 400, {
    width: 800,
    align: "center",
  });
  doc.opacity(1);
  doc.restore();

  // --- Letterhead ---
  if (fs.existsSync(LOGO_PATH)) {
    doc.image(LOGO_PATH, 56, 48, { width: 32 });
  }
  doc
    .fontSize(16)
    .fillColor(NAVY)
    .font("Helvetica-Bold")
    .text("StackPrime Consulting Ltd", 100, 52);
  doc
    .fontSize(9)
    .fillColor(BLUE)
    .font("Helvetica-Oblique")
    .text("Secure. Scalable. Connected.", 100, 72);

  doc.moveTo(56, 100).lineTo(539, 100).strokeColor(GOLD).lineWidth(2).stroke();

  // --- Title ---
  doc.moveDown(3);
  doc.fontSize(20).fillColor(NAVY).font("Helvetica-Bold").text("SP VAS — Vulnerability Assessment Report", 56, 120);
  doc.fontSize(10).fillColor(MUTED).font("Helvetica").text(`Target: ${target}`, 56, 148);
  doc.text(`Assessed: ${scannedAt.toUTCString()}`, 56, 162);

  // --- Grade box ---
  const gradeY = 190;
  doc.roundedRect(56, gradeY, 483, 70, 6).fillColor(NAVY).fill();
  doc
    .fontSize(36)
    .fillColor(GOLD)
    .font("Helvetica-Bold")
    .text(result.grade, 76, gradeY + 14, { width: 60 });
  doc
    .fontSize(11)
    .fillColor("#FFFFFF")
    .font("Helvetica")
    .text(`Overall Score: ${result.score} / 100`, 150, gradeY + 18);
  doc
    .fontSize(9)
    .fillColor("#C9D2E3")
    .text("This is a free, passive, external assessment — not a full penetration test.", 150, gradeY + 38, {
      width: 360,
    });

  // --- Findings ---
  let y = gradeY + 95;
  doc.fontSize(13).fillColor(NAVY).font("Helvetica-Bold").text("Findings", 56, y);
  y += 22;

  const order = ["critical", "high", "medium", "low", "info"];
  const sorted = [...result.findings].sort((a, b) => order.indexOf(a.severity) - order.indexOf(b.severity));

  if (sorted.length === 0) {
    doc.fontSize(10).fillColor(MUTED).font("Helvetica").text("No issues found in this assessment.", 56, y);
    y += 20;
  }

  for (const finding of sorted) {
    if (y > 740) {
      doc.addPage();
      y = 56;
    }
    doc
      .fontSize(8)
      .fillColor(SEVERITY_COLOR[finding.severity] ?? MUTED)
      .font("Helvetica-Bold")
      .text(finding.severity.toUpperCase(), 56, y, { width: 60 });
    doc.fontSize(10).fillColor("#2B3550").font("Helvetica").text(finding.message, 122, y, { width: 417 });
    y += 20;
  }

  // --- Raw detail summary ---
  if (y > 700) {
    doc.addPage();
    y = 56;
  } else {
    y += 16;
  }
  doc.fontSize(13).fillColor(NAVY).font("Helvetica-Bold").text("Detail Summary", 56, y);
  y += 20;

  const detailLines = [
    `TLS: ${findings.tls.ok ? `${findings.tls.protocol ?? "unknown protocol"}, issuer ${findings.tls.issuer ?? "unknown"}` : `unavailable (${findings.tls.error ?? "connection failed"})`}`,
    `HTTP status: ${findings.headers.statusCode ?? "n/a"}`,
    `Security headers present: ${findings.headers.present.join(", ") || "none"}`,
    `SPF record: ${findings.dnsSecurity.spf.present ? "present" : "not found"}`,
    `DMARC record: ${findings.dnsSecurity.dmarc.present ? `present (policy: ${findings.dnsSecurity.dmarc.policy ?? "n/a"})` : "not found"}`,
    `Open sensitive ports: ${findings.ports.filter((p) => p.open).map((p) => `${p.label} (${p.port})`).join(", ") || "none detected"}`,
    `security.txt: ${findings.wellKnown.securityTxt ? "present" : "not found"}`,
  ];
  doc.fontSize(9).fillColor("#3A4258").font("Helvetica");
  for (const line of detailLines) {
    doc.text(`•  ${line}`, 56, y, { width: 483 });
    y += 16;
  }

  // --- CTA footer ---
  const ctaY = 760;
  doc.roundedRect(56, ctaY, 483, 55, 6).fillColor("#FFF6E5").fill();
  doc
    .fontSize(11)
    .fillColor(NAVY)
    .font("Helvetica-Bold")
    .text("Want the full picture?", 72, ctaY + 12);
  doc
    .fontSize(9)
    .fillColor("#5A4200")
    .font("Helvetica")
    .text(
      "This free assessment checks external, publicly visible signals only. A full VAPT engagement covers what this can't see — request one at stackprimeconsulting.com/company/contact.",
      72,
      ctaY + 28,
      { width: 450 }
    );

  doc.end();
  return new Promise<void>((resolve, reject) => {
    stream.on("finish", () => resolve());
    stream.on("error", reject);
  });
}
