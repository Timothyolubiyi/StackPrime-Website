// Central content model for site structure, so the mega-menu, footer, and
// service pages all read from one place rather than duplicating copy.

export type SubService = {
  name: string;
};

export type ServiceFeature = {
  title: string;
  description: string;
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

  // Optional fields used by the deeper installation-service pages. The
  // original five service pages leave these out and render as before.
  eyebrow?: string;
  imageAlt?: string;
  overview?: string[];
  features?: ServiceFeature[];
  process?: ServiceFeature[];
  idealFor?: string[];
  ctaHeading?: string;
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
      "We provide Linux server setup, hardening, migration, automation, and ongoing maintenance designed for reliability, security, and operational efficiency. Our approach establishes robust infrastructure from the outset while ensuring systems remain secure, stable, and well-maintained throughout their lifecycle..",
    image: "/images/linux-server-admin.jpg",
    subServices: [
      { name: "Server Setup & Hardening" },
      { name: "Server Maintenance & Support" },
      { name: "Migration & Automation" },
    ],
    cta: { label: "Book a Consultation", href: "/company/contact" },
  },
  {
    slug: "intercom-voip-installation",
    name: "Intercom / VoIP Installation",
    shortName: "Intercom & VoIP",
    eyebrow: "Installation Services",
    tagline:
      "Clear communication inside your building and beyond it — designed, installed, and tested end to end.",
    description:
      "We design and install intercom systems and VoIP phone systems for offices, estates, and commercial buildings — from cabling and handset placement to call routing and staff walkthroughs.",
    image: "/images/intercom-voip.jpg",
    imageAlt: "Intercom and VoIP system installation",
    overview: [
      "Reliable communication is the backbone of any working office, estate, or facility. StackPrime designs and installs intercom systems and VoIP (Voice over IP) telephony as one coordinated project, so the door station at your gate, the handset at reception, and the phone lines connecting you to customers work together instead of as separate, disconnected systems.",
      "Intercom installations cover audio and video door entry, internal station-to-station calling, reception and gate integration, and, where required, door-release control. VoIP installations replace or extend traditional phone lines with IP-based calling: internal extensions, call routing, voicemail, and auto-attendant menus, plus connection to your external telephone provider, all running over the same structured network your business already depends on.",
      "Because both systems live on your network, cabling, power (including Power over Ethernet), and network readiness are treated as part of the job, not an afterthought. Every installation ends with testing, documentation, and a hands-on walkthrough so your team knows how to use what was installed.",
    ],
    subServices: [
      { name: "Audio & Video Intercom Systems" },
      { name: "Gate & Door-Release Integration" },
      { name: "VoIP Phone System Setup" },
      { name: "IP Handsets & Softphones" },
      { name: "Structured Cabling & PoE Readiness" },
      { name: "Testing, Documentation & Handover" },
    ],
    features: [
      {
        title: "Audio & Video Intercom Systems",
        description:
          "Door stations, indoor monitors, and internal station-to-station calling for offices, estates, and multi-tenant buildings.",
      },
      {
        title: "Gate & Door-Release Integration",
        description:
          "Intercom stations linked to gate motors or electric door locks so entry can be granted from a handset or monitor, where your building supports it.",
      },
      {
        title: "VoIP Phone System Setup",
        description:
          "Extensions, hunt groups, voicemail, auto-attendant, and call routing configured around how your business actually takes calls.",
      },
      {
        title: "IP Handsets & Softphones",
        description:
          "Desk phones and app-based softphones provisioned and registered, so staff can take calls at their desk or on the move.",
      },
      {
        title: "Structured Cabling & PoE Readiness",
        description:
          "Cable runs, patching, and Power over Ethernet planning so handsets and door stations are powered and connected cleanly.",
      },
      {
        title: "Testing, Documentation & Handover",
        description:
          "Call-quality testing, labelled cabling, a record of the system as installed, and a walkthrough for your team.",
      },
    ],
    process: [
      {
        title: "Site Survey & Requirements",
        description:
          "We walk the site, map station and handset locations, and confirm what your building and network need before quoting.",
      },
      {
        title: "Design & Proposal",
        description:
          "A clear scope covering equipment, cabling, configuration, and timeline, with no surprises on cost.",
      },
      {
        title: "Installation & Configuration",
        description:
          "Cabling, mounting, and system setup, carried out with minimal disruption to your working day.",
      },
      {
        title: "Testing & Handover",
        description:
          "Every station and extension is tested, your team is walked through daily use, and the setup is documented.",
      },
    ],
    idealFor: [
      "Offices moving from analogue lines or consumer phones to a proper business phone system",
      "Residential estates and gated communities needing dependable gate-to-house communication",
      "Multi-tenant and commercial buildings with reception, security, and tenant call points",
      "Schools, clinics, and small facilities that need calling between departments",
    ],
    ctaHeading: "Ready to plan your intercom or VoIP installation?",
    cta: { label: "Book a Consultation", href: "/company/contact" },
  },
  {
    slug: "office-home-lan-wan-installation",
    name: "Office and Home LAN/WAN Installation",
    shortName: "LAN/WAN",
    eyebrow: "Installation Services",
    tagline:
      "Wired and wireless networks that are cleanly cabled, properly secured, and built to grow with you.",
    description:
      "We design and install local area networks (LAN) and wide area networks (WAN) for offices, multi-site businesses, and homes — structured cabling, switching, WiFi, and internet connectivity delivered as one tidy, documented installation.",
    image: "/images/office-home-lan-wan.jpg",
    imageAlt: "Office and home LAN/WAN network installation",
    overview: [
      "A network is only as reliable as the cabling and configuration underneath it. StackPrime designs and installs LAN (local area network) and WAN (wide area network) infrastructure for offices and homes as one complete project: structured cabling, patch panels and racks, switching, wireless access, router and firewall setup, and internet connectivity, planned around how many people and devices actually depend on it.",
      "For offices, that means a LAN that separates staff, guest, and device traffic, WiFi coverage designed for the floor plan rather than guessed at, and, for businesses with more than one location, WAN connectivity that links sites securely. For homes, it means dependable coverage in every room, wired connections where they matter most (home offices, entertainment, CCTV), and a setup a non-technical household can live with.",
      "Every job finishes with labelled cabling, tested links, and a written record of how the network is laid out, so the next change, fault, or expansion does not start from guesswork.",
    ],
    subServices: [
      { name: "Structured Cabling" },
      { name: "LAN Design & Switching" },
      { name: "WiFi Coverage Design" },
      { name: "Router, Firewall & Internet Setup" },
      { name: "WAN & Multi-Site Connectivity" },
      { name: "Testing, Documentation & Handover" },
    ],
    features: [
      {
        title: "Structured Cabling",
        description:
          "Category-rated copper cabling (and fibre where distance or speed demands it), wall outlets, patch panels, and tidy rack or cabinet work, tested and labelled end to end.",
      },
      {
        title: "LAN Design & Switching",
        description:
          "Switch selection and layout, VLAN segmentation, and PoE planning for phones, access points, and cameras.",
      },
      {
        title: "WiFi Coverage Design",
        description:
          "Access point placement and configuration for consistent coverage, sized to the number of users and devices.",
      },
      {
        title: "Router, Firewall & Internet Setup",
        description:
          "Routing, firewall rules, and connection to your internet provider or providers, including failover where continuity matters.",
      },
      {
        title: "WAN & Multi-Site Connectivity",
        description:
          "Secure links between offices or branches using VPN or provider circuits, so separate sites work as one network.",
      },
      {
        title: "Testing, Documentation & Handover",
        description:
          "Speed and throughput testing, labelled ports, a network diagram, and a walkthrough of what was installed.",
      },
    ],
    process: [
      {
        title: "Site Survey",
        description:
          "We assess the building layout, cable routes, device counts, and internet requirements before recommending anything.",
      },
      {
        title: "Network Design & Proposal",
        description:
          "A clear plan covering topology, equipment, cabling scope, and cost.",
      },
      {
        title: "Installation & Configuration",
        description:
          "Cabling, equipment mounting, and configuration, carried out with minimal disruption to the workday or household.",
      },
      {
        title: "Testing & Handover",
        description:
          "Every link tested, everything labelled and documented, and a walkthrough for your team or household.",
      },
    ],
    idealFor: [
      "Offices setting up new premises or replacing an unreliable, patched-together network",
      "Businesses with more than one location that need sites connected securely",
      "Homes with home offices, smart devices, or WiFi dead spots",
      "Properties combining a network with CCTV, VoIP, or intercom systems that need a solid foundation",
    ],
    ctaHeading: "Ready to plan your office or home network?",
    cta: { label: "Book a Consultation", href: "/company/contact" },
  },
  {
    slug: "cctv-camera-installation",
    name: "CCTV Camera Installation",
    shortName: "CCTV",
    eyebrow: "Installation Services",
    tagline:
      "See what matters, from anywhere — CCTV designed around your premises, your power situation, and your budget.",
    description:
      "We survey, design, and install CCTV surveillance systems for offices, shops, homes, and estates — including solar-powered, SIM-connected cameras for sites with no mains power or internet — so you can rely on the footage when it counts.",
    image: "/images/cctv-installation.jpg",
    imageAlt: "CCTV camera installation",
    overview: [
      "An effective CCTV system starts with where the cameras go and what they need to capture, not with which box of cameras is cheapest. StackPrime begins every CCTV installation with a site survey covering entry points, blind spots, lighting conditions, and the areas that matter most to you, so camera type, power source, and storage all match the actual job — not a generic package.",
      "We install a range of camera types depending on the site: dome cameras for discreet indoor and outdoor coverage, bullet cameras for long-range, visible deterrence, PTZ (pan-tilt-zoom) cameras for active monitoring of large open areas, and turret cameras where a wider viewing angle is needed without the dome housing. Each is selected for where it's mounted and what it needs to see, not applied one-size-fits-all across a property.",
      "For sites without reliable mains electricity or existing network cabling — perimeter fencing, farms, construction sites, remote gates, rural estates — we install solar-powered CCTV cameras with SIM (cellular 4G/LTE) connectivity. These units run independently of both the power grid and your WiFi or ethernet network: the solar panel and battery keep the camera running, and the SIM card handles the connection for remote viewing and alerts, so coverage is possible even where nothing else is installed yet.",
      "Storage is sized to how long you actually need to keep footage, not fixed by default. Options include on-camera SD card storage for simple, single-camera setups, a network video recorder (NVR) with hard drive capacity sized to your number of cameras, resolution, and retention period (commonly 7, 14, or 30 days), and cloud backup for footage that stays accessible even if local storage is damaged, stolen, or tampered with.",
      "Because surveillance footage is sensitive, security is part of the installation: default credentials are changed, remote access is restricted, and the CCTV network is kept properly separated from the rest of your network. Every installation ends with a live demonstration, so you know how to view, search, and export footage.",
    ],
    subServices: [
      { name: "Site Survey & Camera Placement" },
      { name: "Dome, Bullet, PTZ & Turret Cameras" },
      { name: "Solar-Powered & SIM-Connected Cameras" },
      { name: "Storage Sizing (SD, NVR, Cloud)" },
      { name: "Night Vision & Motion Detection" },
      { name: "Secure Remote Viewing" },
      { name: "Cabling & Power (PoE)" },
      { name: "Testing, Training & Handover" },
    ],
    features: [
      {
        title: "Dome, Bullet, PTZ & Turret Cameras",
        description:
          "Discreet dome cameras, long-range bullet cameras, actively-monitored PTZ cameras, and wide-angle turret cameras — matched to where each one is mounted and what it needs to capture.",
      },
      {
        title: "Solar-Powered & SIM-Connected Cameras",
        description:
          "Standalone units with solar panel and battery power plus 4G/LTE SIM connectivity — for perimeters, gates, farms, and remote sites with no mains electricity or network cabling nearby.",
      },
      {
        title: "Flexible Storage Options",
        description:
          "On-camera SD card, NVR hard-drive storage sized to your camera count and retention period, or cloud backup — matched to how long you actually need footage kept.",
      },
      {
        title: "Night Vision & Motion Detection",
        description:
          "Infrared night vision for 24-hour coverage, plus motion-triggered recording and push alerts so nothing important is missed.",
      },
      {
        title: "Smart Detection Features",
        description:
          "Person and vehicle detection, line-crossing, and area alerts on camera models that support them — reducing false alerts from irrelevant motion.",
      },
      {
        title: "Secure Remote Viewing",
        description:
          "Live and playback access from your phone or computer, with default credentials changed and remote access hardened.",
      },
      {
        title: "Cabling & Power (PoE)",
        description:
          "Neat, protected cable runs with Power over Ethernet where suitable, so wired cameras get data and power over a single cable.",
      },
      {
        title: "Weatherproof, Outdoor-Rated Housing",
        description:
          "Outdoor cameras rated for sun, rain, and dust, so coverage holds up through the conditions your site actually experiences.",
      },
      {
        title: "Testing, Training & Handover",
        description:
          "A live test of every camera, a walkthrough on viewing and exporting footage, and documentation of the setup.",
      },
    ],
    process: [
      {
        title: "Site Survey & Risk Walkthrough",
        description:
          "We walk the premises with you to identify entry points, blind spots, power and network availability, and the areas that need coverage.",
      },
      {
        title: "Design & Proposal",
        description:
          "Camera types and count, power source (mains, PoE, or solar/SIM), storage capacity, and cabling scope laid out clearly, with cost.",
      },
      {
        title: "Installation & Configuration",
        description:
          "Mounting, cabling or solar/SIM setup, and system configuration, carried out with minimal disruption to your day.",
      },
      {
        title: "Testing & Handover",
        description:
          "Every camera tested live, you are shown how to view and export footage, and the setup is documented.",
      },
    ],
    idealFor: [
      "Offices and commercial premises that need to monitor entrances, reception, and equipment or stock areas",
      "Shops and small businesses looking to deter theft and review incidents",
      "Homes and residential estates wanting perimeter and entrance coverage",
      "Farms, construction sites, and remote perimeters with no mains power or network cabling — solar and SIM-connected cameras",
      "Properties that want CCTV, networking, and intercom handled by one team",
    ],
    ctaHeading: "Ready to plan your CCTV installation?",
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
