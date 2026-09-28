import type { Metadata } from "next";
import { Source_Serif_4, Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const heading = Source_Serif_4({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-heading",
  display: "swap",
});

const body = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "StackPrime Consulting Ltd | Secure. Scalable. Connected.",
    template: "%s | StackPrime Consulting Ltd",
  },
  description:
    "StackPrime Consulting Ltd (RC 9676973) — Cloud, DevOps, Cybersecurity, Networking & IT Infrastructure, and Linux Server Administration consulting and training, based in Lagos, Nigeria.",
  metadataBase: new URL("https://stackprimeconsulting.com.ng"),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${heading.variable} ${body.variable}`}>
      <body className="font-sans bg-white antialiased">
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
