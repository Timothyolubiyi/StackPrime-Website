import type { Metadata } from "next";
import Container from "@/components/Container";
import CtaButton from "@/components/CtaButton";

export const metadata: Metadata = {
  title: "Get Started",
  description: "Tell us what you're looking for and we'll point you in the right direction.",
};

const options = [
  {
    title: "Consulting & Security Services",
    description: "Cloud, DevOps, Cybersecurity, Networking & IT Infrastructure, Web Applications or Linux Administration.",
    cta: "Book a Consultation",
    href: "/company/contact",
  },
  {
    title: "Training Academy",
    description: "Enroll in a live, virtual, interactive technical training program.",
    cta: "View Programs",
    href: "/training-academy",
  },
  {
    title: "SaaS Products",
    description: "See SP Fast and our growing catalog of enterprise software.",
    cta: "Explore Products",
    href: "/saas-products",
  },
  {
    title: "Web Solutions",
    description: "Try our free browser-based tools — no install required.",
    cta: "Try Free",
    href: "/web-solutions",
  },
];

export default function GetStartedPage() {
  return (
    <section className="bg-navy py-20 text-white md:py-28">
      <Container>
        <div className="text-center">
          <div className="text-sm font-semibold text-gold">Get Started</div>
          <h1 className="mt-2 font-serif text-3xl font-bold md:text-4xl">What can we help you with today?</h1>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {options.map((opt) => (
            <div key={opt.title} className="flex flex-col rounded-lg bg-navy-light p-6">
              <h3 className="font-serif text-lg font-semibold">{opt.title}</h3>
              <p className="mt-2 flex-1 text-sm text-white/70">{opt.description}</p>
              <div className="mt-4">
                <CtaButton href={opt.href} variant="gold">
                  {opt.cta}
                </CtaButton>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
