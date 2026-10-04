import type { Metadata } from "next";
import Container from "@/components/Container";
import ServiceCard from "@/components/ServiceCard";
import CtaButton from "@/components/CtaButton";
import { serviceDomains } from "@/lib/site-data";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Software and app development, cloud computing, DevOps engineering, cybersecurity, networking and IT infrastructure, Linux server administration, and specialist installation services from StackPrime Consulting Ltd.",
};

export default function ServicesPage() {
  return (
    <>
      <section className="bg-navy py-16 text-white md:py-20">
        <Container>
          <div className="text-sm font-semibold text-gold">Services</div>
          <h1 className="mt-2 max-w-2xl font-serif text-4xl font-bold md:text-5xl">
            Consulting and installation services
          </h1>
          <p className="mt-4 max-w-2xl text-white/85">
            Expert consulting and installation services delivered as standalone engagements or integrated programs tailored to your organization’s needs, infrastructure, and growth objectives.
          </p>
        </Container>
      </section>

      <section className="py-16">
        <Container>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {serviceDomains.map((s) => (
              <ServiceCard key={s.slug} service={s} />
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-[#F7F8FA] py-16">
        <Container className="text-center">
          <h2 className="font-serif text-2xl font-bold text-navy">Not sure where to start?</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted">
            A short discovery call is the fastest way to find out which engagement fits your business needs.
          </p>
          <div className="mt-6">
            <CtaButton href="/company/contact" variant="gold">
              Book a Consultation
            </CtaButton>
          </div>
        </Container>
      </section>
    </>
  );
}
