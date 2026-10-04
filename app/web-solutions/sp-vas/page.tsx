import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import Container from "@/components/Container";
import VasScanForm from "@/components/VasScanForm";

export const metadata: Metadata = {
  title: "SP VAS — Free Vulnerability Assessment",
  description:
    "Run a free, non-intrusive vulnerability assessment of any public website or IP address — TLS, security headers, DNS security, and port exposure, graded in minutes.",
};

export default function SpVasPage() {
  return (
    <>
      <PageHero
        eyebrow="Web Solutions"
        title="SP VAS — Vulnerability Assessment"
        description="A fast, non-intrusive security assessment of any public-facing website or IP address — free for your first 3 scans."
        image="/images/vapt-1.jpg"
        imageAlt="Vulnerability assessment dashboard"
      />
      <section className="py-16">
        <Container>
          <VasScanForm />
        </Container>
      </section>
    </>
  );
}
