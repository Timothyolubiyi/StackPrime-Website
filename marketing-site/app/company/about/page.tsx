import type { Metadata } from "next";
import Image from "next/image";
import PageHero from "@/components/PageHero";
import Container from "@/components/Container";
import { companyInfo, standards } from "@/lib/site-data";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "StackPrime Consulting Ltd — founder story, mission, and standards alignment for our Lagos-based technology consulting and training firm.",
};

const values = [
  { title: "Security First", description: "Every engagement is grounded in recognized standards — OWASP, NIST, CIS, ISO 27001." },
  { title: "Built to Scale", description: "Solutions designed for where a client is headed, not just where they are today." },
  { title: "Always Connected", description: "Systems, teams, and support that stay reliably in sync." },
  { title: "Practical Excellence", description: "Hands-on delivery over theory — measurable outcomes, clear reporting." },
];

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About Us"
        title="Who We Are"
        description="A technology consulting and professional training firm delivering secure, scalable, sustainable, and connected digital infrastructure."
        image="/images/office-1.jpg"
        imageAlt="StackPrime team collaborating in the office"
      />

      <section className="py-16">
        <Container>
          <div className="grid gap-10 md:grid-cols-3">
            <div className="md:col-span-2">
              <p className="text-muted">
                <b>StackPrime Consulting Ltd</b> is a technology consulting and professional training firm, focuses on helping organizations build, secure, automate, and optimize modern technology environments. We provide practical, business-focused technology solutions
                 across Cloud Computing, DevOps and Automation, Cybersecurity, Networking and Telecommunications, Linux and Systems Administration, and IT Project Management. Our goal is to help
                  organizations strengthen their technology infrastructure, improve operational efficiency, reduce unnecessary complexity, and build secure and scalable platforms that can support
                   long-term growth.
              </p>
              <p className="mt-4 text-muted">
                At StackPrime, we understand that technology investment goes beyond purchasing tools and deploying infrastructure. Organizations need reliable architecture, effective security controls,
                 streamlined operations, skilled technical teams, and the right implementation strategy to turn technology investments into measurable business value. Our consulting approach therefore
                  combines technical expertise, structured project delivery, security best practices, automation, and knowledge transfer.
              </p>
              <h2 className="mt-8 font-serif text-2xl font-bold text-navy">
                Technology, Security & Business Working Together
              </h2>
              <p className="mt-4 text-muted">
                One of StackPrime&apos;s key strengths is the ability to approach technology from multiple interconnected perspectives. A cloud environment, for example, is not simply a collection of
                 virtual machines and storage resources. It requires appropriate network architecture, identity and access management, security controls, automation, monitoring, cost management,
                  disaster recovery, and operational processes. Our multidisciplinary approach enables us to consider these components together, helping clients develop technology environments that 
                  are not only functional, but also secure, maintainable, resilient, scalable, and prepared for future requirements.
              </p>

              <div className="relative mt-8 h-72 overflow-hidden rounded-lg">
                <Image
                  src="/images/office-2.jpg"
                  alt="StackPrime team in a meeting"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 66vw"
                />
              </div>
            </div>

            <aside className="rounded-lg bg-navy p-6 text-white">
              <h3 className="font-serif text-lg font-semibold text-gold">At a Glance</h3>
              <dl className="mt-4 space-y-4 text-md">
                
                <div>
                  <dt className="font-semibold text-blue">Headquarters</dt>
                  <dd className="mt-1 text-white/85">{companyInfo.location}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-blue">Founder</dt>
                  <dd className="mt-1 text-white/85">Timothy Olubiyi, Chief Consultant</dd>
                </div>
                <div>
                  <dt className="font-semibold text-blue">Service Model</dt>
                  <dd className="mt-1 text-white/85">Consulting · Training · SaaS · Web Apps Development</dd>
                </div>
                <div>
                  <dt className="font-semibold text-blue">Reach</dt>
                  <dd className="mt-1 text-white/85">Nigeria → Africa → Global</dd>
                </div>
              </dl>
            </aside>
          </div>
        </Container>
      </section>

      <section className="bg-[#F7F8FA] py-16">
        <Container>
          <h2 className="font-serif text-2xl font-bold text-navy">Our Values</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {values.map((v) => (
              <div key={v.title}>
                <div className="h-1 w-10 rounded bg-gold" />
                <h3 className="mt-3 font-serif text-lg font-semibold text-navy">{v.title}</h3>
                <p className="mt-2 text-md text-muted">{v.description}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-[#F7F8FA] py-16">
        <Container>
          <h2 className="font-serif text-2xl font-bold text-navy">Our Vision</h2>

            <div className="mt-8">
            <div className="h-1 w-10 rounded bg-gold" />

            <h3 className="mt-3 max-w-4xl font-serif text-lg leading-relaxed text-navy">
                To become a trusted technology consulting and professional training partner, enabling organizations and technology professionals to
                confidently build, secure, automate, and manage modern digital
                infrastructure.
            </h3>
            </div>
        </Container>
      </section>

      <section className="bg-[#F7F8FA] py-16">
        <Container>
          <h2 className="font-serif text-2xl font-bold text-navy">Our Mission</h2>

            <div className="mt-8">
            <div className="h-1 w-10 rounded bg-gold" />

            <h3 className="mt-3 max-w-4xl font-serif text-lg leading-relaxed text-navy">
                To deliver practical technology consulting and hands-on professional training that strengthens infrastructure, improves security,
                 accelerates automation, and develops the technical capabilities organizations and professionals need to succeed in a rapidly
                  evolving digital environment.
            </h3>
            </div>
        </Container>
      </section>

      <section className="py-16">
        <Container>
          <h2 className="font-serif text-2xl font-bold text-navy">Our Industry Standards & Frameworks</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {standards.map((s) => (
              <div key={s.name} className="rounded-lg border border-gray-100 p-4">
                <div className="font-semibold text-navy">{s.name}</div>
                <div className="mt-1 text-md text-muted">{s.detail}</div>
              </div>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
