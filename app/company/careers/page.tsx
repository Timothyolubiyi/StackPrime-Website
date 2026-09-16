import type { Metadata } from "next";
import Image from "next/image";
import PageHero from "@/components/PageHero";
import Container from "@/components/Container";
import { companyInfo } from "@/lib/site-data";

export const metadata: Metadata = {
  title: "Careers",
  description: "Careers at StackPrime Consulting Ltd — open roles and what it's like to work with our team.",
};

export default function CareersPage() {
  return (
    <>
          
      <PageHero
        eyebrow="Careers"
        title="Build with us"
        description="Join a growing team of technology professionals passionate about building secure, scalable,
         and innovative digital solutions. We work across cloud computing, cybersecurity, networking, web and application development, DevOps, and professional technical training—creating opportunities to solve real-world challenges, develop new skills, and make a meaningful impact."
        image="/images/careers-1.jpg"
        imageAlt="StackPrime team collaborating"
      />

      <section className="py-16">
        <Container>
          <div className="grid gap-10 md:grid-cols-2">
            <div className="relative h-72 overflow-hidden rounded-lg">
              <Image
                src="/images/office-3.jpg"
                alt="StackPrime team working together"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
            <div>
              <h2 className="font-serif text-2xl font-bold text-navy">Open Roles</h2>
              <p className="mt-4 text-muted">
                We don’t have any open positions at the moment, but as StackPrime continues to grow, new opportunities will become available. 
                If you have skills and experience that align with what we do, we’d still love to hear from you and keep your profile in consideration
                 for future opportunities.
              </p>
              <p className="mt-4 text-sm text-muted">
                Reach us at{" "}
                <a href={`mailto:${companyInfo.emailOperations}`} className="text-blue hover:underline">
                  {companyInfo.emailOperations}
                </a>
              </p>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
