import PageHero from "./PageHero";
import Container from "./Container";
import CtaButton from "./CtaButton";
import type { ServiceDomain } from "@/lib/site-data";

export default function ServiceDomainTemplate({
  service,
}: {
  service: ServiceDomain;
}) {
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
              <h2 className="font-serif text-2xl font-bold text-navy">
                Overview
              </h2>

              <div className="mt-4 space-y-4 text-med text-muted">
                {service.overview?.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-gray-100 bg-[#F7F8FA] p-6">
              <h3 className="font-serif text-lg font-semibold text-navy">
                What&apos;s included
              </h3>

              <ul className="mt-4 space-y-3">
                {service.subServices.map((sub) => (
                  <li
                    key={sub.name}
                    className="flex gap-2 text-med text-ink"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gold" />
                    {sub.name}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
      </section>

      {service.features?.length > 0 && (
        <section className="bg-[#F7F8FA] py-16">
          <Container>
            <h2 className="font-serif text-3xl font-bold text-navy">
              What we provide
            </h2>

            <div className="mt-10 grid gap-6 md:grid-cols-2">
              {service.features.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-lg border border-gray-100 bg-white p-6"
                >
                  <h3 className="font-serif text-xl font-semibold text-navy">
                    {feature.title}
                  </h3>

                  <p className="mt-3 text-muted">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </Container>
        </section>
      )}

      {service.process?.length > 0 && (
        <section className="py-16">
          <Container>
            <h2 className="font-serif text-3xl font-bold text-navy">
              Our process
            </h2>

            <div className="mt-10 grid gap-6 md:grid-cols-2">
              {service.process.map((step, index) => (
                <div
                  key={step.title}
                  className="rounded-lg border border-gray-100 p-6"
                >
                  <div className="text-sm font-semibold text-gold">
                    Step {index + 1}
                  </div>

                  <h3 className="mt-2 font-serif text-xl font-semibold text-navy">
                    {step.title}
                  </h3>

                  <p className="mt-3 text-muted">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </Container>
        </section>
      )}

      {service.idealFor?.length > 0 && (
        <section className="bg-[#F7F8FA] py-16">
          <Container>
            <h2 className="font-serif text-3xl font-bold text-navy">
              Who this is for
            </h2>

            <ul className="mt-8 grid gap-4 md:grid-cols-2">
              {service.idealFor.map((item) => (
                <li
                  key={item}
                  className="flex gap-3 rounded-lg border border-gray-100 bg-white p-5 text-ink"
                >
                  <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-gold" />
                  <span>{item}</span>
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
              {service.ctaHeading ??
                `Ready to talk through your ${service.shortName.toLowerCase()} needs?`}
            </h2>

            <p className="mt-2 text-white/75">
              A scoping call is the first step — no commitment required.
            </p>
          </div>

          <CtaButton href={service.cta.href} variant="gold">
            {service.cta.label}
          </CtaButton>
        </Container>
      </section>
    </>
  );
}
