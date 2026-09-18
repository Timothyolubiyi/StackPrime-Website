import Image from "next/image";
import Link from "next/link";
import Container from "@/components/Container";
import CtaButton from "@/components/CtaButton";
import ServiceCard from "@/components/ServiceCard";
import ProcessSteps from "@/components/ProcessSteps";
import Newsletter from "@/components/Newsletter";
import { serviceDomains, standards, companyInfo } from "@/lib/site-data";

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-navy text-white">
        <div className="absolute inset-0">
          <Image
            src="/images/hero-banner.jpg"
            alt="Global network infrastructure connecting data centers worldwide"
            fill
            priority
            className="object-cover opacity-600"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/90 to-navy/60" />
        </div>
        <Container className="relative py-24 md:py-36">
          <div className="max-w-2xl">
            <h1 className="font-serif text-4xl font-bold leading-tight md:text-6xl">
              Secure. Scalable. Connected.
            </h1>
            <p className="mt-5 text-lg text-white/85 md:text-xl">
              Cloud, cybersecurity, networking, and infrastructure consulting for businesses across Nigeria and
              beyond — delivering the technology your business needs while equipping your team with the skills to operate, secure, and scale it with confidence.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <CtaButton href="/get-started" variant="gold">
                Get Started
              </CtaButton>
              <CtaButton href="/company/contact" variant="outline">
                Book a Consultation
              </CtaButton>
            </div>
          </div>
        </Container>
      </section>

      {/* Trust bar */}
      <section className="border-b border-gray-100 bg-white py-8">
        <Container>
          <div className="flex flex-wrap items-center justify-between gap-6 text-sm text-muted">
            <div className="font-semibold text-navy"></div>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {standards.map((s) => (
                <span key={s.name}>{s.name}</span>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* Four pillars */}
      <section className="py-30">
        <Container>
          <div className="max-w-2xl">
            <div className="text-sm font-semibold text-gold">What We Do</div>
            <h2 className="mt-2 font-serif text-3xl font-bold text-navy md:text-4xl">
              Four ways we serve our clients
            </h2>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <PillarCard
              title="Consulting & Security Services"
              description="Cloud, DevOps, Cybersecurity, Networking & IT Infrastructure, and Linux Administration engagements."
              href="/services"
              cta="Explore Services"
            />
            <PillarCard
              title="Training Academy"
              description="Live, virtual, interactive courses across our core technology domains."
              href="/training-academy"
              cta="View Programs"
            />
            <PillarCard
              title="SaaS Solutions"
              description="Enterprise software and web applications development, starting with SP Fast — a Network Performance Intelligence platform."
              href="/saas-products"
              cta="See Products"
            />
            <PillarCard
              title="Web Solutions"
              description="Freemium browser-based tools: speed testing, VAPT assessment, file scanning."
              href="/web-solutions"
              cta="Try Free"
            />
          </div>
        </Container>
      </section>

      {/* Core service grid */}
      <section className="bg-[#F7F8FA] py-20">
        <Container>
          <div className="max-w-2xl">
            <div className="text-sm font-semibold text-gold">Consulting Services</div>
            <h2 className="mt-2 font-serif text-3xl font-bold text-navy md:text-4xl">
              Five domains. One standard of delivery.
            </h2>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {serviceDomains.map((s) => (
              <ServiceCard key={s.slug} service={s} />
            ))}
          </div>
        </Container>
      </section>

      {/* Process */}
      <section className="py-20">
        <Container>
          <div className="max-w-2xl">
            <div className="text-sm font-semibold text-gold">Our Process</div>
            <h2 className="mt-2 font-serif text-3xl font-bold text-navy md:text-4xl">How we work</h2>
          </div>
          <div className="mt-10">
            <ProcessSteps />
          </div>
        </Container>
      </section>

      {/* About snapshot */}
      <section className="bg-[#F7F8FA] py-20">
        <Container>
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div className="relative h-80 overflow-hidden rounded-lg md:h-96">
              <Image
                src="/images/founder-portrait.jpg"
                alt="Timothy Olubiyi, Founder & Chief Consultant of StackPrime Consulting Ltd"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
            <div>
              <div className="text-sm font-semibold text-gold">About StackPrime</div>
              <h2 className="mt-2 font-serif text-3xl font-bold text-navy">
                Led by Timothy Olubiyi, Founder & Chief Consultant
              </h2>
              <p className="mt-4 text-muted">
                StackPrime Consulting Ltd is a technology consulting and professional training firm, with digital solutions helping
                organizations build secure, scalable, and well-connected digital infrastructure — and training their
                teams to run it with confidence.
              </p>
              <div className="mt-6">
                <CtaButton href="/company/about" variant="blue">
                  Read Our Story
                </CtaButton>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Insights teaser */}
      <section className="py-20">
        <Container>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-sm font-semibold text-gold">Publications</div>
              <h2 className="mt-2 font-serif text-3xl font-bold text-navy">Insights from our team</h2>
            </div>
            <Link href="/company/publications" className="hidden text-sm font-medium text-blue hover:underline md:block">
              View all publications
            </Link>
          </div>
          <div className="mt-10">
            <Link
              href="/company/publications"
              className="inline-flex items-center rounded-md bg-navy px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Publications  — Read the technical articles from the published books on cloud, security, and networking.
            </Link>
          </div>
        </Container>
      </section>

      {/* Newsletter */}
      <section className="pb-20">
        <Container>
          <Newsletter />
        </Container>
      </section>
    </>
  );
}

function PillarCard({
  title,
  description,
  href,
  cta,
}: {
  title: string;
  description: string;
  href: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-lg bg-navy p-6 text-white transition-transform hover:-translate-y-1"
    >
      <div className="h-1 w-10 rounded bg-gold" />
      <h3 className="mt-4 font-serif text-lg font-semibold">{title}</h3>
      <p className="mt-2 flex-1 text-sm text-white/75">{description}</p>
      <span className="mt-4 text-sm font-medium text-gold group-hover:underline">{cta}</span>
    </Link>
  );
}
