import Image from "next/image";
import PageHero from "./PageHero";
import Container from "./Container";
import CtaButton from "./CtaButton";
import type { ServiceDomain } from "@/lib/site-data";

export default function ServiceDomainTemplate({ service }: { service: ServiceDomain }) {
  const overview = service.overview ?? [];
  const features = service.features ?? [];
  const steps = service.process ?? [];
  const idealFor = service.idealFor ?? [];
  const rich = overview.length > 0;

  return (
    <>
      <PageHero
        eyebrow={service.eyebrow ?? "Consulting Services"}
        title={service.name}
        description={service.tagline}
        image={service.image}
        imageAlt={service.imageAlt ?? service.name}
      />

      <section className="py-16">
        <Container>
          <div className="grid gap-10 md:grid-cols-3">
            <div className="md:col-span-2">
              <h2 className="font-serif text-2xl font-bold text-navy">Overview</h2>
              {rich ? (
                <>
                  {overview.map((paragraph, i) => (
                    <p key={i} className="mt-4 text-muted">
                      {paragraph}
                    </p>
                  ))}
                  <div className="relative mt-8 h-64 overflow-hidden rounded-lg md:h-80">
                    <Image
                      src={service.image}
                      alt={service.imageAlt ?? service.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 66vw"
                    />
                  </div>
                </>
              ) : (
                <p className="mt-4 text-muted">{service.description}</p>
              )}
            </div>
            <div className="h-fit rounded-lg border border-gray-100 bg-[#F7F8FA] p-6">
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

      {rich && features.length > 0 && (
        <section className="bg-[#F7F8FA] py-16">
          <Container>
            <h2 className="font-serif text-2xl font-bold text-navy">What we deliver</h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <div key={feature.title} className="rounded-lg border border-gray-100 bg-white p-6">
                  <div className="h-1 w-10 rounded bg-gold" />
                  <h3 className="mt-4 font-serif text-lg font-semibold text-navy">{feature.title}</h3>
                  <p className="mt-2 text-sm text-muted">{feature.description}</p>
                </div>
              ))}
            </div>
          </Container>
        </section>
      )}

      {rich && steps.length > 0 && (
        <section className="py-16">
          <Container>
            <h2 className="font-serif text-2xl font-bold text-navy">How it works</h2>
            <div className="mt-8 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              {steps.map((step, i) => (
                <div key={step.title}>
                  <div className="text-sm font-semibold text-gold">Step {i + 1}</div>
                  <h3 className="mt-2 font-serif text-lg font-semibold text-navy">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted">{step.description}</p>
                </div>
              ))}
            </div>
          </Container>
        </section>
      )}

      {rich && idealFor.length > 0 && (
        <section className="bg-[#F7F8FA] py-16">
          <Container>
            <h2 className="font-serif text-2xl font-bold text-navy">Who this is for</h2>
            <ul className="mt-6 grid gap-4 md:grid-cols-2">
              {idealFor.map((item) => (
                <li key={item} className="flex gap-3 text-ink">
                  <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gold" />
                  {item}
                </li>
              ))}
            </ul>
          </Container>
        </section>
      )}

      <section className="bg-navy py-16 text-white">
        <Container className="flex flex-col items-center gap-6 text-center md:flex-row md:justify-between md:text-left">
          <div>
            <h2 className="font-serif text-2xl font-bold">
              {service.ctaHeading ?? "Ready to talk through your " + service.shortName.toLowerCase() + " needs?"}
            </h2>
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
