import type { Metadata } from "next";
import ServiceDomainTemplate from "@/components/ServiceDomainTemplate";
import { serviceDomains } from "@/lib/site-data";


const service = serviceDomains.find((s) => s.slug === "networking-it-infrastructure")!;

export const metadata: Metadata = {
  title: service.name,
  description: service.description,
};

export default function NetworkingPage() {
  return <ServiceDomainTemplate service={service} />;
}

