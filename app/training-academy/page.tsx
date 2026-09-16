import type { Metadata } from "next";
import Image from "next/image";
import PageHero from "@/components/PageHero";
import Container from "@/components/Container";
import CtaButton from "@/components/CtaButton";

export const metadata: Metadata = {
  title: "Training Academy",
  description:
    "Live, virtual, interactive technical training from StackPrime Consulting Ltd — Cybersecurity, Linux Server Administration, and Cloud, DevOps & IT Networking programs.",
};

const courses = [
  {
    meta: "4-Month Program",
    title: "Cybersecurity Training",
    description: "Build a strong cybersecurity foundation and progress into practical, real-world security assessment. Our comprehensive curriculum takes you from core security principles and best practices to hands-on vulnerability assessment, threat analysis, security testing, and practical defense techniques—equipping you with the knowledge and confidence to tackle real-world cybersecurity challenges.",
  },
  {
    meta: "Guided Program",
    title: "Linux Server Administration",
    description: "Build the skills to confidently deploy, secure, manage, and automate Linux servers in real-world environments. Our hands-on training covers server setup, user and access management, networking, security hardening, system monitoring, troubleshooting, backups, and automation—giving you practical experience to manage reliable Linux infrastructure in modern IT, cloud, and DevOps environments.",
  },
  {
    meta: "Applied Program",
    title: "Cloud, DevOps & IT Networking",
    description: "Practical training across cloud platforms, DevOps tooling, and IT/network infrastructure. Build practical, job-ready technology skills through hands-on training in cloud computing, DevOps, and IT/network infrastructure. Learn how to design, deploy, automate, secure, and manage modern technology environments using industry-relevant tools and real-world projects.",
  },
  {
    meta: "Onboarding Track",
    title: "Orientation & Foundations",
    description: "Build a strong foundation for your technical journey with practical orientation, essential concepts, industry insights, and the right mindset for success. Learners are introduced to StackPrime’s training approach, tools, technologies, and professional expectations—giving them the confidence and direction to progress into more advanced technical programs.",
  },
];

export default function TrainingAcademyPage() {
  return (
    <>
      <PageHero
        eyebrow="Training"
        title="Training Academy"
        description="Live, virtual, interactive courses — practical skills in the same domains we consult in."
        image="/images/training-1.jpg"
        imageAlt="Instructor leading a live virtual training session"
      />

      <section className="py-16">
        <Container>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {courses.map((c) => (
              <div key={c.title} className="overflow-hidden rounded-lg border border-gray-100">
                <div className="bg-blue px-4 py-3 text-xs font-semibold text-white">{c.meta}</div>
                <div className="bg-[#F7F8FA] p-4">
                  <h3 className="font-serif text-base font-semibold text-navy">{c.title}</h3>
                  <p className="mt-2 text-sm text-muted">{c.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-lg bg-cream p-6 text-center italic text-[#5A4200]">
            All programs are delivered virtually via live interactive sessions — no pre-recorded-only tracks.
          </div>

          <div className="relative mt-12 h-80 overflow-hidden rounded-lg">
            <Image
              src="/images/training-2.jpg"
              alt="Live virtual training session with instructor and participants"
              fill
              className="object-cover"
              sizes="100vw"
            />
          </div>
        </Container>
      </section>

      <section className="bg-navy py-16 text-white">
        <Container className="flex flex-col items-center gap-6 text-center md:flex-row md:justify-between md:text-left">
          <div>
            <h2 className="font-serif text-2xl font-bold">Ready to enroll?</h2>
            <p className="mt-2 text-white/75">Submit your details and we&apos;ll follow up with enrollment steps.</p>
          </div>
          <CtaButton href="/company/contact" variant="gold">
            Enroll Now
          </CtaButton>
        </Container>
      </section>
    </>
  );
}
