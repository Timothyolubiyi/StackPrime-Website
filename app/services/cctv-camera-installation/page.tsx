import type { Metadata } from "next";
import ServiceDomainTemplate from "@/components/ServiceDomainTemplate";
import { serviceDomains } from "@/lib/site-data";

const service = serviceDomains.find((s) => s.slug === "cctv-camera-installation")!;

export const metadata: Metadata = {
  title: service.name,
  description: service.description,
};

export default function CctvCameraInstallationPage() {
  return <ServiceDomainTemplate service={service} />;
}
