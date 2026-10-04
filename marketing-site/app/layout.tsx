import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: {
    default: "StackPrime Consulting Ltd | Secure. Scalable. Connected.",
    template: "%s | StackPrime Consulting Ltd",
  },
  description:
    "StackPrime Consulting Ltd — Cloud, DevOps, Cybersecurity, Networking & IT Infrastructure, and Linux Server Administration consulting and training, based in Lagos, Nigeria.",
  metadataBase: new URL("https://stackprimeconsulting.com.ng"),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans bg-white antialiased">
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}