import type { Metadata } from "next";
import Image from "next/image";
import PageHero from "@/components/PageHero";
import Container from "@/components/Container";
import CtaButton from "@/components/CtaButton";
import { standards } from "@/lib/site-data";

export const metadata: Metadata = {
  title: "VAPT / Security Assessments",
  description:
    "Vulnerability Assessment & Penetration Testing (VAPT) from StackPrime Consulting Ltd — methodology, standards, and deliverables for oil & gas, finance, and telecom sectors.",
};

const deliverables = [
  "Scoped proposal & asset inventory workbook",
  "Findings report with CVSS v3.1-rated severity",
  "Remediation guidance per finding",
  "Executive summary for leadership",
];

const industries = [
  { name: "Oil & Gas", note: "Leading sector — our most mature and currently active engagement type." },
  { name: "Finance", note: "Compliance-driven assessments aligned to sector regulatory expectations." },
  { name: "Telecom", note: "Network and infrastructure-focused security assessments." },
  { name: "SMEs", note: "Right-sized assessments for growing businesses." },
];

export default function VaptPage() {
  return (
    <>
      <PageHero
        eyebrow="Flagship Offering"
        title="VAPT / Security Assessments"
        description="Vulnerability Assessment & Penetration Testing — identifying, validating, and helping remediate security weaknesses across networks, applications, and infrastructure."
        image="/images/vapt-1.jpg"
        imageAlt="Security operations dashboard showing a VAPT assessment in progress"
      />

      <section className="py-16">
        <Container>
          <div className="grid gap-12 md:grid-cols-3">
            <div className="md:col-span-2">
              <h2 className="font-serif text-2xl font-bold text-navy">Methodology</h2>
              <p className="mt-4 text-muted">
                Our assessments are mapped to recognized industry standards rather than following an ad-hoc
                checklist — so findings are defensible, comparable over time, and understood by both technical
                teams and leadership.
              </p>

              <div className="relative mt-8 h-72 overflow-hidden rounded-lg">
                <Image
                  src="/images/vapt-2.jpg"
                  alt="Multi-monitor VAPT assessment dashboard showing vulnerability findings and risk distribution"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 66vw"
                />
              </div>

              <h2 className="mt-10 font-serif text-2xl font-bold text-navy">Engagement Deliverables</h2>
              <ul className="mt-4 space-y-3">
                {deliverables.map((d) => (
                  <li key={d} className="flex gap-2 text-ink">
                    <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gold" />
                    {d}
                  </li>
                ))}
              </ul>

              <h2 className="mt-10 font-serif text-2xl font-bold text-navy">Industries Served</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {industries.map((ind) => (
                  <div key={ind.name} className="rounded-lg border border-gray-100 p-4">
                    <div className="font-semibold text-navy">{ind.name}</div>
                    <div className="mt-1 text-sm text-muted">{ind.note}</div>
                  </div>
                ))}
              </div>
            </div>

            <aside className="rounded-lg bg-navy p-6 text-white">
              <h3 className="font-serif text-lg font-semibold text-gold">Standards & Methodology</h3>
              <ul className="mt-4 space-y-4">
                {standards.map((s) => (
                  <li key={s.name}>
                    <div className="font-semibold">{s.name}</div>
                    <div className="text-sm text-white/70">{s.detail}</div>
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        </Container>
      </section>

      <section className="bg-[#F7F8FA] py-16">
        <Container className="flex flex-col items-center gap-6 text-center md:flex-row md:justify-between md:text-left">
          <div>
            <h2 className="font-serif text-2xl font-bold text-navy">Request a Security Assessment</h2>
            <p className="mt-2 text-muted">Tell us your scope and sector — we&apos;ll follow up with next steps.</p>
          </div>
          <CtaButton href="/company/contact" variant="gold">
            Request a Security Assessment
          </CtaButton>
        </Container>
      </section>
    </>
  );
}
