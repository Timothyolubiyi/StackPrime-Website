import PDFDocument from "pdfkit";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gradeSpeed, gradeColor } from "./scoring.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = path.join(__dirname, "..", "..", "assets", "logo-icon.png");

const NAVY = "#001236";
const GOLD = "#D89A00";
const BLUE = "#0072D6";
const MUTED = "#6B7280";

export const REPORTS_DIR = path.join(__dirname, "..", "..", "reports");
fs.mkdirSync(REPORTS_DIR, { recursive: true });

export async function generateReport(
  resultId: string,
  downloadMbps: number,
  uploadMbps: number,
  latencyMs: number
): Promise<string> {
  const grade = gradeSpeed(downloadMbps);
  const filename = `sp-fast-speedtest-${Date.now()}-${resultId.slice(0, 8)}.pdf`;
  const filepath = path.join(REPORTS_DIR, filename);

  const doc = new PDFDocument({ size: "A4", margin: 56 });
  const stream = fs.createWriteStream(filepath);
  doc.pipe(stream);

  // --- Letterhead ---
  if (fs.existsSync(LOGO_PATH)) {
    doc.image(LOGO_PATH, 56, 48, { width: 40 });
  }
  doc
    .fontSize(16)
    .fillColor(NAVY)
    .font("Helvetica-Bold")
    .text("StackPrime Consulting Ltd", 106, 52)
    .fontSize(9)
    .fillColor(BLUE)
    .font("Helvetica-Oblique")
    .text("Secure. Scalable. Connected. Empowering Your Digital Future.", 106, 72);

  doc.moveTo(56, 110).lineTo(539, 110).strokeColor("#DCE1EA").lineWidth(1).stroke();

  // --- Watermark (diagonal, low opacity — not a formal engagement doc) ---
  doc.save();
  doc.rotate(-40, { origin: [297, 420] });
  doc.fontSize(34).fillColor("#E6E9EF").opacity(0.55);
  doc.text("STACKPRIME CONSULTING", -40, 372, { width: 700, align: "center" });
  doc.fontSize(20);
  doc.text("FREE SPEED TEST  -  NOT FOR ENGAGEMENT USE", -40, 418, { width: 700, align: "center" });
  doc.opacity(1);
  doc.restore();

  // --- Title ---
  doc
    .fontSize(20)
    .fillColor(NAVY)
    .font("Helvetica-Bold")
    .text("SP Fast Speed Test — Results", 56, 140);
  doc
    .fontSize(10)
    .fillColor(MUTED)
    .font("Helvetica")
    .text(`Generated ${new Date().toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short" })}`, 56, 168);

  // --- Grade badge ---
  const color = gradeColor(grade);
  doc.roundedRect(56, 200, 483, 74, 6).fillColor(color).fillOpacity(0.08).fill();
  doc.fillOpacity(1);
  doc
    .fontSize(14)
    .fillColor(color)
    .font("Helvetica-Bold")
    .text(`Overall: ${grade}`, 76, 222);
  doc
    .fontSize(10)
    .fillColor(MUTED)
    .font("Helvetica")
    .text("Based on measured download throughput against a single-region test server.", 76, 244, { width: 440 });

  // --- Metrics table ---
  const metrics: [string, string][] = [
    ["Download Speed", `${downloadMbps.toFixed(1)} Mbps`],
    ["Upload Speed", `${uploadMbps.toFixed(1)} Mbps`],
    ["Latency (Ping)", `${latencyMs.toFixed(0)} ms`],
  ];
  let y = 298;
  for (const [label, value] of metrics) {
    doc.fontSize(11).fillColor(NAVY).font("Helvetica-Bold").text(label, 56, y, { width: 200 });
    doc.fontSize(11).fillColor(MUTED).font("Helvetica").text(value, 280, y);
    doc.moveTo(56, y + 22).lineTo(539, y + 22).strokeColor("#EEF1F5").lineWidth(1).stroke();
    y += 34;
  }

  // --- Reading your results ---
  y += 14;
  doc.fontSize(13).fillColor(NAVY).font("Helvetica-Bold").text("Reading your results", 56, y);
  y += 24;
  const guide: [string, string][] = [
    [
      "Download speed",
      "How fast data reaches your device. This drives streaming, browsing, and file downloads, and it is the figure behind the overall grade.",
    ],
    [
      "Upload speed",
      "How fast data leaves your device. It matters for video calls, cloud backups, and sending large files.",
    ],
    [
      "Latency (ping)",
      "The round-trip delay to the test server. Lower is better; high latency makes calls and online games feel laggy even on a fast connection.",
    ],
  ];
  for (const [term, meaning] of guide) {
    doc.fontSize(10).fillColor(NAVY).font("Helvetica-Bold").text(term, 56, y, { width: 483 });
    y = doc.y + 2;
    doc.fontSize(10).fillColor(MUTED).font("Helvetica").text(meaning, 56, y, { width: 483 });
    y = doc.y + 10;
  }

  // --- Note on scope ---
  y += 6;
  doc
    .fontSize(9)
    .fillColor(MUTED)
    .font("Helvetica-Oblique")
    .text(
      "This test measures performance against a single StackPrime test server and reflects conditions at the time " +
        "of testing — network variability, time of day, and local device load can all affect results. SP Fast " +
        "Enterprise provides continuous, multi-region monitoring with historical trend reporting and alerting, " +
        "built for ongoing network performance management rather than a one-time check.",
      56,
      y,
      { width: 483 }
    );

  // --- CTA footer ---
  const footerY = 740;
  doc.moveTo(56, footerY).lineTo(539, footerY).strokeColor("#DCE1EA").lineWidth(1).stroke();
  doc
    .fontSize(10)
    .fillColor(NAVY)
    .font("Helvetica-Bold")
    .text("Want continuous monitoring instead of a one-time check?", 56, footerY + 12);
  doc
    .fontSize(9)
    .fillColor(MUTED)
    .font("Helvetica")
    .text("Ask about SP Fast Enterprise — stackprimeconsulting.com.ng/saas-products", 56, footerY + 28);

  doc.end();

  return new Promise((resolve, reject) => {
    stream.on("finish", () => resolve(filename));
    stream.on("error", reject);
  });
}
