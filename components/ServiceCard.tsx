import Link from "next/link";
import Image from "next/image";
import type { ServiceDomain } from "@/lib/site-data";

export default function ServiceCard({ service }: { service: ServiceDomain }) {
  return (
    <Link
      href={`/services/${service.slug}`}
      className="group block overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="relative h-44 w-full overflow-hidden">
        <Image
          src={service.image}
          alt={service.name}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
      </div>
      <div className="p-5">
        <h3 className="font-serif text-lg font-semibold text-navy">{service.name}</h3>
        <p className="mt-2 text-med text-muted">{service.tagline}</p>
      </div>
    </Link>
  );
}
