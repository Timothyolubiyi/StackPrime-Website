import type { Metadata } from "next";
import Image from "next/image";
import PageHero from "@/components/PageHero";
import Container from "@/components/Container";
import CtaButton from "@/components/CtaButton";

export const metadata: Metadata = {
  title: "SaaS Solutions",
  description:
    "SP Fast — StackPrime's enterprise Network Performance Intelligence / Internet Performance Monitoring platform, plus a growing catalog of SaaS products.",
};

const capabilities = [
  "Real-time Visibility — live metrics and distributed tracing across your entire stack.",
  "Proactive Alerts — smart alerting with noise reduction and actionable insights.",
  "Performance First — optimize performance and deliver exceptional user experiences.",
];

export default function SaasProductsPage() {
  return (
    <>
      <PageHero
        eyebrow="Products"
        title="SaaS Solutions"
        description="A growing catalog of enterprise software, starting with our flagship network intelligence platform."
        image="/images/product-ui-1.jpg"
        imageAlt="SP Fast dashboard showing real-time performance monitoring"
      />

      <section className="py-16">
        <Container>
          <div className="rounded-lg bg-navy p-8 text-white md:p-12">
            <div className="inline-block rounded-full bg-gold px-4 py-1 text-xs font-semibold text-navy">
              FLAGSHIP
            </div>
            <h2 className="mt-4 font-serif text-4xl font-bold">SP Fast</h2>
            <p className="mt-2 text-lg italic text-blue">
              Network Performance Intelligence / Internet Performance Monitoring (IPM) Platform
            </p>
            <p className="mt-4 max-w-2xl text-white/80">
              Positioned as an enterprise IPM platform, not a consumer speed-test tool — continuous monitoring,
              multi-region measurement, alerting, SLA verification, and historical trend reporting for IT and
              network teams.
            </p>

            <div className="relative mt-8 h-96 overflow-hidden rounded-lg">
              <Image
                src="/images/product-ui-2.jpg"
                alt="SP Fast performance dashboard with response time trends and alerts"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 900px"
              />
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {capabilities.map((c) => {
                const [title, ...rest] = c.split(" — ");
                return (
                  <div key={title} className="rounded-lg bg-navy-light p-4">
                    <div className="font-semibold text-gold">{title}</div>
                    <div className="mt-1 text-sm text-white/70">{rest.join(" — ")}</div>
                  </div>
                );
              })}
            </div>

            <p className="mt-8 text-sm italic text-white/60">
              Free browser extension — unmetered top-of-funnel entry point. Enterprise/Team tier is the commercial
              product.
            </p>
          </div>

          <div className="mt-10 rounded-lg border border-gray-100 bg-[#F7F8FA] p-8 text-center">
            <h3 className="font-serif text-xl font-semibold text-navy">More products coming to the catalog</h3>
            <p className="mt-2 text-muted">
              Our SaaS catalog is built to hold multiple products — future tools will appear here as they launch.
            </p>
          </div>
        </Container>
      </section>

      <section className="bg-navy py-16 text-white">
        <Container className="flex flex-col items-center gap-6 text-center md:flex-row md:justify-between md:text-left">
          <div>
            <h2 className="font-serif text-2xl font-bold">See SP Fast for your organization</h2>
            <p className="mt-2 text-white/75">Enterprise demos are scoped to your network environment.</p>
          </div>
          <CtaButton href="/company/contact" variant="gold">
            Request a Demo
          </CtaButton>
        </Container>
      </section>
    </>
  );
}
