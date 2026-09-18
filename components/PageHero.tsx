import Image from "next/image";
import Container from "./Container";

export default function PageHero({
  eyebrow,
  title,
  description,
  image,
  imageAlt,
}: {
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
}) {
  return (
    <section className="relative overflow-hidden bg-navy text-white">
      <div className="absolute inset-0">
        <Image src={image} alt={imageAlt} fill className="object-cover opacity-100" priority sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/95 to-navy/70" />
      </div>
      <Container className="relative py-20 md:py-28">
        <div className="max-w-2xl">
          <div className="text-med font-semibold tracking-wide text-gold">{eyebrow}</div>
          <h1 className="mt-3 font-serif text-4xl font-bold leading-tight md:text-5xl">{title}</h1>
          <p className="mt-5 text-lg text-white/85">{description}</p>
        </div>
      </Container>
    </section>
  );
}
