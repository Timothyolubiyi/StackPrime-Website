import Link from "next/link";

type Variant = "gold" | "blue" | "outline";

export default function CtaButton({
  href,
  children,
  variant = "gold",
}: {
  href: string;
  children: React.ReactNode;
  variant?: Variant;
}) {
  const styles: Record<Variant, string> = {
    gold: "bg-gold text-navy hover:bg-gold/90",
    blue: "bg-blue text-white hover:bg-blue/90",
    outline: "border border-white/30 text-white hover:bg-white/10",
  };

  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition-colors ${styles[variant]}`}
    >
      {children}
    </Link>
  );
}
