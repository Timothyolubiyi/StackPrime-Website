#!/usr/bin/env node
/**
 * add-sp-vas-image.mjs
 *
 * Adds a product image to the SP VAS card on app/saas-products/page.tsx,
 * matching the same full-width image treatment SP Fast already has
 * (description → image → capability tags).
 *
 * Requires the SP VAS card to already exist (i.e. you've already run
 * add-sp-vas-to-saas-products.mjs). Safe to run more than once — checks
 * whether the image is already present first.
 *
 * Usage (run from your marketing site's root folder):
 *   node add-sp-vas-image.mjs
 *   node add-sp-vas-image.mjs path/to/app/saas-products/page.tsx
 */

import fs from "node:fs";
import path from "node:path";

const targetPath = process.argv[2] ?? path.join("app", "saas-products", "page.tsx");

if (!fs.existsSync(targetPath)) {
  console.error(`\n✗ Could not find ${targetPath}`);
  console.error("  Run this from your marketing site's root folder, or pass the path explicitly.\n");
  process.exit(1);
}

const source = fs.readFileSync(targetPath, "utf8");

if (!source.includes("SP VAS")) {
  console.error(`\n✗ No SP VAS card found in ${targetPath}.`);
  console.error("  Run add-sp-vas-to-saas-products.mjs first.\n");
  process.exit(1);
}

if (source.includes('alt="SP VAS')) {
  console.log(`\n✓ SP VAS image already present in ${targetPath} — nothing to do.\n`);
  process.exit(0);
}

const anchor = `                <p className="mt-4 max-w-xl text-muted">
                  A fast, non-intrusive vulnerability assessment of any public-facing website or IP address —
                  TLS configuration, security headers, DNS security posture, and common exposed ports, graded
                  and delivered as a branded PDF report in minutes.
                </p>
                <ul className="mt-4 flex flex-wrap gap-2">`;

if (!source.includes(anchor)) {
  console.error(`\n✗ Expected SP VAS card content not found in ${targetPath}.`);
  console.error("  The file may have been edited since this script was written — add the image block manually.\n");
  process.exit(1);
}

const replacement = `                <p className="mt-4 max-w-xl text-muted">
                  A fast, non-intrusive vulnerability assessment of any public-facing website or IP address —
                  TLS configuration, security headers, DNS security posture, and common exposed ports, graded
                  and delivered as a branded PDF report in minutes.
                </p>

                <div className="relative mt-6 h-64 w-full overflow-hidden rounded-lg md:h-72">
                  <Image
                    src="/images/vapt-2.jpg"
                    alt="SP VAS vulnerability assessment dashboard showing risk findings and scan progress"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 700px"
                  />
                </div>

                <ul className="mt-6 flex flex-wrap gap-2">`;

// Also widen the card back to full stacking (image needs the full card
// width, not just the text column) — remove the side-by-side flex wrapper
// so the image and CTA buttons both span the full card width, matching
// SP Fast's vertical layout.
const flexOpenAnchor = `            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
              <div>`;
const flexOpenReplacement = `            <div className="flex flex-col gap-6">
              <div>`;

const flexCloseAnchor = `              </div>
              <div className="flex flex-shrink-0 flex-col gap-3 md:w-48">`;
const flexCloseReplacement = `              </div>
              <div className="flex flex-col gap-3 sm:flex-row">`;

if (!source.includes(flexOpenAnchor) || !source.includes(flexCloseAnchor)) {
  console.error(`\n✗ Expected SP VAS card wrapper markup not found in ${targetPath}.`);
  console.error("  The layout may have changed since this script was written — add the image manually.\n");
  process.exit(1);
}

let updated = source.replace(anchor, replacement);
updated = updated.replace(flexOpenAnchor, flexOpenReplacement);
updated = updated.replace(flexCloseAnchor, flexCloseReplacement);
updated = updated.replace(
  'className="inline-flex items-center justify-center rounded-full bg-gold px-6 py-3 text-sm font-semibold text-navy hover:bg-gold/90"\n                >\n                  Run a Free Assessment',
  'className="inline-flex items-center justify-center rounded-full bg-gold px-6 py-3 text-sm font-semibold text-navy hover:bg-gold/90 sm:w-auto"\n                >\n                  Run a Free Assessment'
);

fs.writeFileSync(targetPath, updated, "utf8");

console.log(`\n✓ Added SP VAS product image to ${targetPath}`);
console.log("  Review the change with: git diff", targetPath);
console.log("  Then run your dev server to check it visually.\n");
