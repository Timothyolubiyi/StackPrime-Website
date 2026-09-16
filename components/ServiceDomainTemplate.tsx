import PageHero from "./PageHero";
import Container from "./Container";
import CtaButton from "./CtaButton";
import type { ServiceDomain } from "@/lib/site-data";

export default function ServiceDomainTemplate({ service }: { service: ServiceDomain }) {
  return (
    <>
      <PageHero
        eyebrow="Consulting Services"
        title={service.name}
        description={service.tagline}
        image={service.image}
        imageAlt={service.name}
      />

      <section className="py-16">
        <Container>
          <div className="grid gap-10 md:grid-cols-3">
            <div className="md:col-span-2">
              <h2 className="font-serif text-2xl font-bold text-navy">Overview</h2>
              <p className="mt-4 text-muted">{service.description}</p>
            </div>
            <div className="rounded-lg border border-gray-100 bg-[#F7F8FA] p-6">
              <h3 className="font-serif text-lg font-semibold text-navy">What&apos;s included</h3>
              <ul className="mt-4 space-y-3">
                {service.subServices.map((sub) => (
                  <li key={sub.name} className="flex gap-2 text-sm text-ink">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gold" />
                    {sub.name}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
      </section>

      <section className="bg-navy py-16 text-white">
        <Container className="flex flex-col items-center gap-6 text-center md:flex-row md:justify-between md:text-left">
          <div>
            <h2 className="font-serif text-2xl font-bold">Ready to talk through your {service.shortName.toLowerCase()} needs?</h2>
            <p className="mt-2 text-white/75">A scoping call is the first step — no commitment required.</p>
          </div>
          <CtaButton href={service.cta.href} variant="gold">
            {service.cta.label}
          </CtaButton>
        </Container>
      </section>
    </>
  );
}
