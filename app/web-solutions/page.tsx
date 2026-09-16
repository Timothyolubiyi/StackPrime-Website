import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import Container from "@/components/Container";

export const metadata: Metadata = {
  title: "Web Solutions",
  description:
    "Try StackPrime's browser-based tools — speed test, VAPT assessment, and file scanning — free, no install required.",
};

// NOTE: these tools are Phase 2 of the build sequencing (Web Solutions runtime),
// not yet built. This page ships now as the marketing shell; each card's CTA
// should be wired to the actual tool once its backend exists, or to a
// "notify me" capture in the meantime.
const tools = [
  {
    name: "Run Speed Test",
    description: "Check your network's real-world speed and latency — the same measurement engine behind SP Fast.",
  },
  {
    name: "Run VAPT Assessment",
    description: "A guided, lightweight security assessment to surface obvious risks before a full engagement.",
  },
  {
    name: "Scan Files",
    description: "Upload a file for a quick security scan before you share or deploy it.",
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
          <div className="grid gap-6 md:grid-cols-3">
            {tools.map((tool) => (
              <div key={tool.name} className="rounded-lg border border-gray-100 p-6">
                <h3 className="font-serif text-lg font-semibold text-navy">{tool.name}</h3>
                <p className="mt-2 text-sm text-muted">{tool.description}</p>
                <span className="mt-4 inline-block rounded-full bg-[#F7F8FA] px-4 py-2 text-xs font-semibold text-muted">
                  Coming soon
                </span>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-lg bg-cream p-6 text-center italic text-[#5A4200]">
            Free tier: 3 uses before an upgrade prompt. Upgrade paths lead to a SaaS Platform subscription, or —
            for the VAPT tool — a qualified consulting engagement.
          </div>
        </Container>
      </section>
    </>
  );
}
