import type { Metadata } from "next";
import Container from "@/components/Container";
import ContactForm from "@/components/ContactForm";
import { companyInfo } from "@/lib/site-data";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with StackPrime Consulting Ltd — Lagos, Nigeria.",
};

export default function ContactPage() {
  return (
    <section className="py-16 md:py-24">
      <Container>
        <div className="grid gap-12 md:grid-cols-2">
          <div>
            <div className="text-sm font-semibold text-gold">Get In Touch</div>
            <h1 className="mt-2 font-serif text-3xl font-bold text-navy md:text-4xl">Contact Us</h1>
            <p className="mt-4 text-muted">
              Whether you need to build, secure, automate, or optimize your technology environment, StackPrime Consulting is ready to help.
               Tell us what you’re working on, the challenge you’re facing, or the outcome you want to achieve. Our team will review your requirements
                and help identify the right solution, service, or training path. Take the next step today. Start a conversation with StackPrime and turn your technology goals into action.
            </p>

            <dl className="mt-8 space-y-5">
            
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gold">Email </dt>
                <dd className="mt-1 text-ink">{companyInfo.emailOperations}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gold">Phone</dt>
                <dd className="mt-1 text-ink">{companyInfo.phone}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gold">Location</dt>
                <dd className="mt-1 text-ink">{companyInfo.location}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-lg border border-gray-100 bg-[#F7F8FA] p-8">
            <ContactForm />
          </div>
        </div>
      </Container>
    </section>
  );
}
