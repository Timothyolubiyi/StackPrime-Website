import Link from "next/link";
import { serviceDomains, companyInfo } from "@/lib/site-data";

export default function Footer() {
  return (
    <footer className="bg-navy text-white">
      <div className="mx-auto max-w-content px-6 py-14">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <div className="font-serif text-lg font-semibold">
              StackPrime<span className="text-gold"> Consulting</span>
            </div>
            <p className="mt-3 text-sm italic text-blue">{companyInfo.tagline}</p>
            <p className="mt-4 text-xs text-white/50">{companyInfo.rc}</p>
          </div>

          <div>
            <div className="text-sm font-semibold text-gold">Services</div>
            <ul className="mt-3 space-y-2">
              {serviceDomains.map((s) => (
                <li key={s.slug}>
                  <Link href={`/services/${s.slug}`} className="text-sm text-white/75 hover:text-white">
                    {s.shortName}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="text-sm font-semibold text-gold">Company</div>
            <ul className="mt-3 space-y-2">
              <li><Link href="/company/about" className="text-sm text-white/75 hover:text-white">About Us</Link></li>
              <li><Link href="/company/careers" className="text-sm text-white/75 hover:text-white">Careers</Link></li>
              <li><Link href="/company/publications" className="text-sm text-white/75 hover:text-white">Publications</Link></li>
              <li><Link href="/company/contact" className="text-sm text-white/75 hover:text-white">Contact Us</Link></li>
              <li><Link href="/training-academy" className="text-sm text-white/75 hover:text-white">Training Academy</Link></li>
              <li><Link href="/saas-products" className="text-sm text-white/75 hover:text-white">SaaS Products</Link></li>
            </ul>
          </div>

          <div>
            <div className="text-sm font-semibold text-gold">Contact</div>
            <ul className="mt-3 space-y-2 text-sm text-white/75">
              <li>{companyInfo.emailOperations}</li>
              <li>{companyInfo.phone}</li>
              <li>{companyInfo.location}</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-white/50 md:flex-row">
          <div>
            &copy; {new Date().getFullYear()} StackPrime Consulting Ltd. All rights reserved.
          </div>
          <div>{companyInfo.rc}</div>
        </div>
      </div>
    </footer>
  );
}
