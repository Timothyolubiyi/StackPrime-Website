import type { Metadata } from "next";
import ServiceDomainTemplate from "@/components/ServiceDomainTemplate";
import { serviceDomains } from "@/lib/site-data";

const service = serviceDomains.find((s) => s.slug === "office-home-lan-wan-installation")!;

export const metadata: Metadata = {
  title: service.name,
  description: service.description,
};

export default function OfficeHomeLanWanInstallationPage() {
  return <ServiceDomainTemplate service={service} />;
}
