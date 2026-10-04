import type { Metadata } from "next";
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
