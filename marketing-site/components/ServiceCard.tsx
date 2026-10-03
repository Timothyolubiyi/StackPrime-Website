import Link from "next/link";
import type { ServiceDomain } from "@/lib/site-data";

export default function ServiceCard({ service }: { service: ServiceDomain }) {
  return (
    <Link
      href={`/services/${service.slug}`}
      className="group block overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="relative h-44 w-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={service.image}
          alt={service.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>

      <div className="p-5">
        <h3 className="font-serif text-lg font-semibold text-navy">
          {service.name}
        </h3>

        <p className="mt-2 text-med text-muted">
          {service.tagline}
        </p>
      </div>
    </Link>
  );
}