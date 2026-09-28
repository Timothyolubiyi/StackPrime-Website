// Central content model for site structure, so the mega-menu, footer, and
// service pages all read from one place rather than duplicating copy.

export type SubService = {
  name: string;
};

export type ServiceDomain = {
  slug: string;
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  image: string;
  subServices: SubService[];
  cta: { label: string; href: string };
};

export const serviceDomains: ServiceDomain[] = [
  {
    slug: "cloud-computing",
    name: "Cloud Computing",
    shortName: "Cloud",
    tagline: "Cloud infrastructure built for where you're growing, not just where you are.",
    description:
      "We design, migrate, and manage secure, scalable cloud environments across AWS, Microsoft Azure, and Google Cloud Platform (GCP). Our approach integrates cost optimization, security, performance, and scalability from the outset, helping organizations build resilient cloud infrastructure that supports long-term growth and operational efficiency.",
    image: "/images/cloud-computing.jpg",
    subServices: [
      { name: "Cloud Strategy & Migration" },
      { name: "Cloud Infrastructure Management" },
      { name: "Cloud Cost Optimization" },
      { name: "Multi-Cloud & Hybrid Cloud Architecture" },
      { name: "Cloud Security & Compliance" },
    ],
    cta: { label: "Book a Consultation", href: "/company/contact" },
  },
  {
    slug: "devops-engineering",
    name: "DevOps Engineering",
    shortName: "DevOps",
    tagline: "Automated pipelines and infrastructure that ship faster, with fewer surprises.",
    description:
      "From CI/CD pipeline design to Infrastructure as Code, we build the automation layer that lets your team deploy confidently and often — not just occasionally and carefully.",
    image: "/images/devops-1.jpg",
    subServices: [
      { name: "CI/CD Pipeline Design & Implementation" },
      { name: "Infrastructure as Code (IaC)" },
      { name: "Containerization & Orchestration" },
      { name: "Monitoring & Observability" },
      { name: "Release & Deployment Automation" },
    ],
    cta: { label: "Book a Consultation", href: "/company/contact" },
  },
  {
    slug: "cybersecurity",
    name: "Cybersecurity",
    shortName: "Cybersecurity",
    tagline: "Standards-aligned security assessment, monitoring, and governance.",
    description:
      "Our cybersecurity practice focuses on Vulnerability Assessment and Penetration Testing (VAPT), security assessments, and risk management, aligned with industry frameworks including OWASP, NIST, ISO and CIS. We combine proactive security testing with continuous monitoring, compliance support, and actionable remediation guidance to help organizations strengthen their security posture and reduce risk.",
    image: "/images/cybersecurity-1.jpg",
    subServices: [
      { name: "VAPT / Security Assessments" },
      { name: "Security Management & Monitoring" },
      { name: "Compliance & Governance (ISO 27001, NIST CSF)" },
    ],
    cta: { label: "Request a Security Assessment", href: "/services/vapt-security-assessments" },
  },
  {
    slug: "networking-it-infrastructure",
    name: "Networking & IT Infrastructure",
    shortName: "Networking",
    tagline: "End-to-end connectivity, from physical infrastructure to the systems that power your business.",
    description:
      "We design, deploy, and maintain reliable network and communications infrastructure that keeps your business connected and productive. Our services cover enterprise Wi-Fi, structured TCP/IP cabling, LAN/WAN infrastructure, intercom systems, VoIP, and unified communications, with solutions tailored to your business environment, capacity, security requirements, and future growth. From network planning and installation to configuration, testing, optimization, and ongoing support, we deliver dependable connectivity designed for performance, scalability, and secure day-to-day operations.",
    image: "/images/networking-2.jpg",
    subServices: [
      { name: "Network Design & Architecture" },
      { name: "WiFi & Wireless Networking" },
      { name: "IT / TCP-IP Networking" },
      { name: "Intercom Systems" },
      { name: "VoIP & Unified Communications" },
      { name: "Network Performance Monitoring" },
      { name: "Network Security" },
    ],
    cta: { label: "Book a Consultation", href: "/company/contact" },
  },
  {
    slug: "linux-server-administration",
    name: "Linux Server Administration",
    shortName: "Linux Admin",
    tagline: "Servers hardened for security, maintained for reliability, and built to stay ahead.",
    description:
      "SWe provide Linux server setup, hardening, migration, automation, and ongoing maintenance designed for reliability, security, and operational efficiency. Our approach establishes robust infrastructure from the outset while ensuring systems remain secure, stable, and well-maintained throughout their lifecycle..",
    image: "/images/linux-server-admin.jpg",
    subServices: [
      { name: "Server Setup & Hardening" },
      { name: "Server Maintenance & Support" },
      { name: "Migration & Automation" },
    ],
    cta: { label: "Book a Consultation", href: "/company/contact" },
  },
];

export const mainNav = [
  { label: "Home", href: "/" },
  {
    label: "Services",
    href: "/services",
    megaMenu: true,
  },
  { label: "Training Academy", href: "/training-academy" },
  { label: "SaaS Products", href: "/saas-products" },
  { label: "Web Solutions", href: "/web-solutions" },
  {
    label: "Company",
    href: "/company/about",
    dropdown: [
      { label: "About Us", href: "/company/about" },
      { label: "Careers", href: "/company/careers" },
      { label: "Publications", href: "/company/publications" },
      { label: "Contact Us", href: "/company/contact" },
    ],
  },
];

export const companyInfo = {
  name: "StackPrime Consulting Ltd",
  rc: "RC 9676973",
  tagline: "Secure. Scalable. Connected. Empowering Your Digital Future.",
  emailGeneral: "stackprimeconsulting@gmail.com",
  emailOperations: "info@stackprimeconsulting.com.ng",
  phone: "+234 814 440 1544",
  location: "Lagos, Nigeria",
  website: "www.stackprimeconsulting.com.ng",
};

export const standards = [
  { name: "OWASP", detail: "Web application security testing" },
  { name: "NIST SP 800-115", detail: "Technical security assessment guide" },
  { name: "NIST CSF", detail: "Cybersecurity risk framework" },
  { name: "CIS Controls v8", detail: "Prioritized security safeguards" },
  { name: "ISO/IEC 27001", detail: "Information security management" },
  { name: "CVSS v3.1", detail: "Vulnerability severity scoring" },
];
