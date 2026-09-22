import type { Metadata } from "next";
import ServiceDomainTemplate from "@/components/ServiceDomainTemplate";
import { serviceDomains } from "@/lib/site-data";

const service = serviceDomains.find((s) => s.slug === "linux-server-administration")!;

export const metadata: Metadata = {
  title: service.name,
  description: service.description,
};

export default function LinuxServerAdminPage() {
  return <ServiceDomainTemplate service={service} />;
}
