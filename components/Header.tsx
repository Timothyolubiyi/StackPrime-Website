"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { serviceDomains, mainNav } from "@/lib/site-data";

export default function Header() {
  const [servicesOpen, setServicesOpen] = useState(false);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-navy text-white">
      <div className="mx-auto flex max-w-content items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/images/logo-icon.png" alt="StackPrime Consulting" width={36} height={40} />
          <span className="font-serif text-lg font-semibold tracking-tight">
            StackPrime<span className="text-gold"> Consulting</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 lg:flex">
          {mainNav.map((item) => {
            if (item.megaMenu) {
              return (
                <div
                  key={item.label}
                  className="relative"
                  onMouseEnter={() => setServicesOpen(true)}
                  onMouseLeave={() => setServicesOpen(false)}
                >
                  <button className="flex items-center gap-1 rounded px-4 py-2 text-sm font-medium hover:bg-white/10">
                    {item.label}
                    <ChevronIcon />
                  </button>
                  {servicesOpen && (
                    <div className="absolute left-1/2 top-full w-[640px] -translate-x-1/2 rounded-lg bg-white p-6 text-ink shadow-xl">
                      <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                        {serviceDomains.map((s) => (
                          <Link
                            key={s.slug}
                            href={`/services/${s.slug}`}
                            className="group block rounded-md p-2 hover:bg-navy/5"
                          >
                            <div className="font-serif text-base font-semibold text-navy group-hover:text-blue">
                              {s.name}
                            </div>
                            <div className="mt-1 text-sm text-muted">{s.tagline}</div>
                          </Link>
                        ))}
                      </div>
                      <div className="mt-4 border-t border-gray-100 pt-4">
                        <Link href="/services" className="text-sm font-medium text-blue hover:underline">
                          View all services
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              );
            }
            if (item.dropdown) {
              return (
                <div
                  key={item.label}
                  className="relative"
                  onMouseEnter={() => setCompanyOpen(true)}
                  onMouseLeave={() => setCompanyOpen(false)}
                >
                  <button className="flex items-center gap-1 rounded px-4 py-2 text-sm font-medium hover:bg-white/10">
                    {item.label}
                    <ChevronIcon />
                  </button>
                  {companyOpen && (
                    <div className="absolute left-0 top-full w-56 rounded-lg bg-white p-2 text-ink shadow-xl">
                      {item.dropdown.map((d) => (
                        <Link
                          key={d.href}
                          href={d.href}
                          className="block rounded-md px-3 py-2 text-sm hover:bg-navy/5"
                        >
                          {d.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }
            return (
              <Link
                key={item.label}
                href={item.href}
                className="rounded px-4 py-2 text-sm font-medium hover:bg-white/10"
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden lg:block">
          <Link
            href="/get-started"
            className="rounded-full bg-gold px-5 py-2 text-sm font-semibold text-navy hover:bg-gold/90"
          >
            Get Started
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          className="lg:hidden"
          aria-label="Toggle menu"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
        >
          <MenuIcon open={mobileOpen} />
        </button>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="border-t border-white/10 px-6 py-4 lg:hidden">
          <MobileNav onNavigate={() => setMobileOpen(false)} />
        </div>
      )}
    </header>
  );
}

function MobileNav({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="flex flex-col gap-1">
      <Link href="/" onClick={onNavigate} className="py-2 text-sm font-medium">
        Home
      </Link>
      <div className="py-2">
        <div className="text-sm font-medium text-gold">Services</div>
        <div className="mt-2 flex flex-col gap-2 pl-3">
          {serviceDomains.map((s) => (
            <Link key={s.slug} href={`/services/${s.slug}`} onClick={onNavigate} className="text-sm text-white/85">
              {s.name}
            </Link>
          ))}
        </div>
      </div>
      <Link href="/training-academy" onClick={onNavigate} className="py-2 text-sm font-medium">
        Training Academy
      </Link>
      <Link href="/saas-products" onClick={onNavigate} className="py-2 text-sm font-medium">
        SaaS Products
      </Link>
      <Link href="/web-solutions" onClick={onNavigate} className="py-2 text-sm font-medium">
        Web Solutions
      </Link>
      <div className="py-2">
        <div className="text-sm font-medium text-gold">Company</div>
        <div className="mt-2 flex flex-col gap-2 pl-3">
          <Link href="/company/about" onClick={onNavigate} className="text-sm text-white/85">About Us</Link>
          <Link href="/company/careers" onClick={onNavigate} className="text-sm text-white/85">Careers</Link>
          <Link href="/company/publications" onClick={onNavigate} className="text-sm text-white/85">Publications</Link>
          <Link href="/company/contact" onClick={onNavigate} className="text-sm text-white/85">Contact Us</Link>
        </div>
      </div>
      <Link
        href="/get-started"
        onClick={onNavigate}
        className="mt-3 inline-block rounded-full bg-gold px-5 py-2 text-center text-sm font-semibold text-navy"
      >
        Get Started
      </Link>
    </div>
  );
}

function ChevronIcon() {
  return (
    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true">
      <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {open ? (
        <path d="M6 6L18 18M6 18L18 6" stroke="white" strokeWidth="2" strokeLinecap="round" />
      ) : (
        <path d="M4 7H20M4 12H20M4 17H20" stroke="white" strokeWidth="2" strokeLinecap="round" />
      )}
    </svg>
  );
}
