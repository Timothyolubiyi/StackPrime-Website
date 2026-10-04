import type { Metadata } from "next";
import ServiceDomainTemplate from "@/components/ServiceDomainTemplate";
import { serviceDomains } from "@/lib/site-data";

const service = serviceDomains.find(
  (item) => item.slug === "software-apps-development",
)!;

export const metadata: Metadata = {
  title: "Software & Apps Development",
  description:
    "Custom software, web applications, mobile apps, API integrations, secure development, and cloud deployment services from StackPrime Consulting Ltd.",
};

export default function SoftwareAppsDevelopmentPage() {
  return <ServiceDomainTemplate service={service} />;
}
