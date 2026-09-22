#!/usr/bin/env node
/**
 * add-sp-vas-to-saas-products.mjs
 *
 * Adds an SP VAS product card to app/saas-products/page.tsx, replacing the
 * "More products coming to the catalog" placeholder with a real SP VAS
 * card plus a shorter "more coming soon" note underneath (SP Fast Speed
 * Test still isn't live yet).
 *
 * Usage (run from inside your marketing site folder):
 *   node add-sp-vas-to-saas-products.mjs
 *
 * Or point it at the file explicitly if your folder layout differs:
 *   node add-sp-vas-to-saas-products.mjs path/to/app/saas-products/page.tsx
 *
 * Safe to run more than once — it checks whether the SP VAS card is
 * already present and exits without changing anything if so.
 */

import fs from "node:fs";
import path from "node:path";

const targetPath = process.argv[2] ?? path.join("app", "saas-products", "page.tsx");

if (!fs.existsSync(targetPath)) {
  console.error(`\n✗ Could not find ${targetPath}`);
  console.error("  Run this from your marketing site's root folder, or pass the path explicitly:");
  console.error("  node add-sp-vas-to-saas-products.mjs path/to/app/saas-products/page.tsx\n");
  process.exit(1);
}

const source = fs.readFileSync(targetPath, "utf8");

if (source.includes("SP VAS")) {
  console.log(`\n✓ SP VAS card already present in ${targetPath} — nothing to do.\n`);
  process.exit(0);
}

const anchor = `          <div className="mt-10 rounded-lg border border-gray-100 bg-[#F7F8FA] p-8 text-center">
            <h3 className="font-serif text-xl font-semibold text-navy">More products coming to the catalog</h3>
            <p className="mt-2 text-muted">
              Our SaaS catalog is built to hold multiple products — future tools will appear here as they launch.
            </p>
          </div>`;

if (!source.includes(anchor)) {
  console.error(`\n✗ Expected placeholder block not found in ${targetPath}.`);
  console.error("  The file may have been edited since this script was written.");
  console.error("  Open the file and add the SP VAS card manually — see the block this script");
  console.error("  would have inserted in its source comments below.\n");
  process.exit(1);
}

const spVasCard = `          <div className="mt-10 rounded-lg border border-gray-100 bg-white p-8 shadow-sm">
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="inline-block rounded-full bg-blue px-4 py-1 text-xs font-semibold text-white">
                  FREE TO TRY
                </div>
                <h3 className="mt-4 font-serif text-2xl font-bold text-navy">SP VAS</h3>
                <p className="mt-1 text-sm italic text-blue">Vulnerability Assessment</p>
                <p className="mt-4 max-w-xl text-muted">
                  A fast, non-intrusive vulnerability assessment of any public-facing website or IP address —
                  TLS configuration, security headers, DNS security posture, and common exposed ports, graded
                  and delivered as a branded PDF report in minutes.
                </p>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {[
                    "TLS & Certificate Analysis",
                    "Security Headers",
                    "DNS Security (SPF/DMARC)",
                    "Port Exposure Check",
                    "Branded PDF Report",
                  ].map((tag) => (
                    <li
                      key={tag}
                      className="rounded-full border border-gray-200 bg-[#F7F8FA] px-3 py-1 text-xs font-medium text-ink"
                    >
                      {tag}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-sm text-muted">
                  Free for your first 3 assessments. Upgrade to Premium for unlimited scans and deeper reporting.
                </p>
              </div>
              <div className="flex flex-shrink-0 flex-col gap-3 md:w-48">
                <a
                  href="/web-solutions"
                  className="inline-flex items-center justify-center rounded-full bg-gold px-6 py-3 text-sm font-semibold text-navy hover:bg-gold/90"
                >
                  Run a Free Assessment
                </a>
                <a
                  href="/company/contact"
                  className="inline-flex items-center justify-center rounded-full border border-gray-200 px-6 py-3 text-sm font-semibold text-ink hover:bg-[#F7F8FA]"
                >
                  Ask About Premium
                </a>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-gray-100 bg-[#F7F8FA] p-8 text-center">
            <h3 className="font-serif text-xl font-semibold text-navy">More products coming to the catalog</h3>
            <p className="mt-2 text-muted">
              SP Fast Speed Test and additional tools will appear here as they launch.
            </p>
          </div>`;

const updated = source.replace(anchor, spVasCard);
fs.writeFileSync(targetPath, updated, "utf8");

console.log(`\n✓ Added SP VAS card to ${targetPath}`);
console.log("  Review the change with: git diff", targetPath);
console.log("  Then run your dev server to check it visually.\n");
