#!/usr/bin/env node
/**
 * add-new-services.mjs
 *
 * Adds three installation services to the StackPrime marketing site:
 *   1. Intercom / VoIP Installation
 *   2. Office and Home LAN/WAN Installation
 *   3. CCTV Camera Installation
 *
 * Each gets its own comprehensive page (overview, image, what we deliver,
 * how it works, who it's for) and appears automatically on the Services
 * page, the homepage service grid, the header mega-menu, and the footer,
 * because all of those read from lib/site-data.ts.
 *
 * What this script changes:
 *   - lib/site-data.ts                     extends the ServiceDomain type (new OPTIONAL
 *                                          fields only) and adds the three services
 *   - components/ServiceDomainTemplate.tsx replaced with a version that renders the richer
 *                                          sections when present. Your five existing
 *                                          service pages render exactly as before.
 *   - app/services/<slug>/page.tsx         three new page files
 *   - app/services/page.tsx, app/page.tsx  two small copy edits so headings no longer say
 *                                          "five domains"
 *
 * Usage (run from your marketing site's root folder, ideally with a clean
 * git working tree so `git diff` shows exactly what changed):
 *   node add-new-services.mjs
 *   node add-new-services.mjs path/to/marketing-site
 *
 * Safe to run more than once: every step checks whether it has already
 * been applied and skips itself if so.
 */

import fs from "node:fs";
import path from "node:path";

// ---------------------------------------------------------------------------
// Image files. Save your attached images into public/images/ with these
// names, or change the names here before running the script.
// ---------------------------------------------------------------------------
const IMAGES = {
  intercom: "intercom-voip.jpg",
  lan: "office-home-lan-wan.jpg",
  cctv: "cctv-installation.jpg",
};

const SLUGS = {
  intercom: "intercom-voip-installation",
  lan: "office-home-lan-wan-installation",
  cctv: "cctv-camera-installation",
};

const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const p = (...segments) => path.join(root, ...segments);

// ---------------------------------------------------------------------------
// Helpers (line-ending safe: works whether your files are LF or CRLF)
// ---------------------------------------------------------------------------
function readText(file) {
  const raw = fs.readFileSync(file, "utf8");
  const crlf = raw.includes("\r\n");
  return { text: crlf ? raw.replace(/\r\n/g, "\n") : raw, crlf };
}

function writeText(file, text, crlf) {
  fs.writeFileSync(file, crlf ? text.replace(/\n/g, "\r\n") : text, "utf8");
}

function count(text, needle) {
  return text.split(needle).length - 1;
}

function fail(message) {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

const summary = [];
const warnings = [];
function record(status, message) {
  summary.push({ status, message });
}

// ---------------------------------------------------------------------------
// Preflight
// ---------------------------------------------------------------------------
const requiredFiles = [
  p("lib", "site-data.ts"),
  p("components", "ServiceDomainTemplate.tsx"),
  p("app", "services", "page.tsx"),
  p("app", "page.tsx"),
];
for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    fail(
      `Could not find ${path.relative(root, file)} under ${root}\n` +
        "  Run this from your marketing site's root folder, or pass the folder path:\n" +
        "  node add-new-services.mjs path/to/marketing-site"
    );
  }
}

// ---------------------------------------------------------------------------
// Step 1: lib/site-data.ts  (type extension + three service entries)
// ---------------------------------------------------------------------------
const OLD_TYPE = `export type ServiceDomain = {
  slug: string;
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  image: string;
  subServices: SubService[];
  cta: { label: string; href: string };
};`;

const NEW_TYPE = `export type ServiceFeature = {
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
};`;

const ARRAY_END_ANCHOR = `  },
];

export const mainNav`;

const NEW_ENTRIES = `  {
    slug: "${SLUGS.intercom}",
    name: "Intercom / VoIP Installation",
    shortName: "Intercom & VoIP",
    eyebrow: "Installation Services",
    tagline:
      "Clear communication inside your building and beyond it — designed, installed, and tested end to end.",
    description:
      "We design and install intercom systems and VoIP phone systems for offices, estates, and commercial buildings — from cabling and handset placement to call routing and staff walkthroughs.",
    image: "/images/${IMAGES.intercom}",
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
    slug: "${SLUGS.lan}",
    name: "Office and Home LAN/WAN Installation",
    shortName: "LAN/WAN",
    eyebrow: "Installation Services",
    tagline:
      "Wired and wireless networks that are cleanly cabled, properly secured, and built to grow with you.",
    description:
      "We design and install local area networks (LAN) and wide area networks (WAN) for offices, multi-site businesses, and homes — structured cabling, switching, WiFi, and internet connectivity delivered as one tidy, documented installation.",
    image: "/images/${IMAGES.lan}",
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
    slug: "${SLUGS.cctv}",
    name: "CCTV Camera Installation",
    shortName: "CCTV",
    eyebrow: "Installation Services",
    tagline:
      "See what matters, from anywhere — CCTV designed around your premises, your power situation, and your budget.",
    description:
      "We survey, design, and install CCTV surveillance systems for offices, shops, homes, and estates — including solar-powered, SIM-connected cameras for sites with no mains power or internet — so you can rely on the footage when it counts.",
    image: "/images/${IMAGES.cctv}",
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
`;

{
  const file = p("lib", "site-data.ts");
  let { text, crlf } = readText(file);
  let changed = false;

  if (text.includes("export type ServiceFeature")) {
    record("skip", "lib/site-data.ts: type already extended");
  } else if (count(text, OLD_TYPE) === 1) {
    text = text.replace(OLD_TYPE, NEW_TYPE);
    changed = true;
    record("done", "lib/site-data.ts: ServiceDomain type extended with optional fields");
  } else {
    fail(
      "lib/site-data.ts: the ServiceDomain type doesn't match what this script expects.\n" +
        "  The file may have been edited since the script was written. Nothing has been changed."
    );
  }

  if (text.includes(`slug: "${SLUGS.intercom}"`)) {
    record("skip", "lib/site-data.ts: the three services are already present");
  } else if (count(text, ARRAY_END_ANCHOR) === 1) {
    text = text.replace(ARRAY_END_ANCHOR, `  },\n${NEW_ENTRIES}];\n\nexport const mainNav`);
    changed = true;
    record("done", "lib/site-data.ts: added Intercom / VoIP, LAN/WAN, and CCTV services");
  } else {
    fail(
      "lib/site-data.ts: couldn't find the end of the serviceDomains list.\n" +
        "  The file may have been edited since the script was written. Nothing has been changed."
    );
  }

  if (changed) writeText(file, text, crlf);
}

// ---------------------------------------------------------------------------
// Step 2: components/ServiceDomainTemplate.tsx
// ---------------------------------------------------------------------------
const NEW_TEMPLATE = `import Image from "next/image";
import PageHero from "./PageHero";
import Container from "./Container";
import CtaButton from "./CtaButton";
import type { ServiceDomain } from "@/lib/site-data";

export default function ServiceDomainTemplate({ service }: { service: ServiceDomain }) {
  const overview = service.overview ?? [];
  const features = service.features ?? [];
  const steps = service.process ?? [];
  const idealFor = service.idealFor ?? [];
  const rich = overview.length > 0;

  return (
    <>
      <PageHero
        eyebrow={service.eyebrow ?? "Consulting Services"}
        title={service.name}
        description={service.tagline}
        image={service.image}
        imageAlt={service.imageAlt ?? service.name}
      />

      <section className="py-16">
        <Container>
          <div className="grid gap-10 md:grid-cols-3">
            <div className="md:col-span-2">
              <h2 className="font-serif text-2xl font-bold text-navy">Overview</h2>
              {rich ? (
                <>
                  {overview.map((paragraph, i) => (
                    <p key={i} className="mt-4 text-muted">
                      {paragraph}
                    </p>
                  ))}
                  <div className="relative mt-8 h-64 overflow-hidden rounded-lg md:h-80">
                    <Image
                      src={service.image}
                      alt={service.imageAlt ?? service.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 66vw"
                    />
                  </div>
                </>
              ) : (
                <p className="mt-4 text-muted">{service.description}</p>
              )}
            </div>
            <div className="h-fit rounded-lg border border-gray-100 bg-[#F7F8FA] p-6">
              <h3 className="font-serif text-lg font-semibold text-navy">What&apos;s included</h3>
              <ul className="mt-4 space-y-3">
                {service.subServices.map((sub) => (
                  <li key={sub.name} className="flex gap-2 text-sm text-ink">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gold" />
                    {sub.name}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
      </section>

      {rich && features.length > 0 && (
        <section className="bg-[#F7F8FA] py-16">
          <Container>
            <h2 className="font-serif text-2xl font-bold text-navy">What we deliver</h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <div key={feature.title} className="rounded-lg border border-gray-100 bg-white p-6">
                  <div className="h-1 w-10 rounded bg-gold" />
                  <h3 className="mt-4 font-serif text-lg font-semibold text-navy">{feature.title}</h3>
                  <p className="mt-2 text-sm text-muted">{feature.description}</p>
                </div>
              ))}
            </div>
          </Container>
        </section>
      )}

      {rich && steps.length > 0 && (
        <section className="py-16">
          <Container>
            <h2 className="font-serif text-2xl font-bold text-navy">How it works</h2>
            <div className="mt-8 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              {steps.map((step, i) => (
                <div key={step.title}>
                  <div className="text-sm font-semibold text-gold">Step {i + 1}</div>
                  <h3 className="mt-2 font-serif text-lg font-semibold text-navy">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted">{step.description}</p>
                </div>
              ))}
            </div>
          </Container>
        </section>
      )}

      {rich && idealFor.length > 0 && (
        <section className="bg-[#F7F8FA] py-16">
          <Container>
            <h2 className="font-serif text-2xl font-bold text-navy">Who this is for</h2>
            <ul className="mt-6 grid gap-4 md:grid-cols-2">
              {idealFor.map((item) => (
                <li key={item} className="flex gap-3 text-ink">
                  <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gold" />
                  {item}
                </li>
              ))}
            </ul>
          </Container>
        </section>
      )}

      <section className="bg-navy py-16 text-white">
        <Container className="flex flex-col items-center gap-6 text-center md:flex-row md:justify-between md:text-left">
          <div>
            <h2 className="font-serif text-2xl font-bold">
              {service.ctaHeading ?? "Ready to talk through your " + service.shortName.toLowerCase() + " needs?"}
            </h2>
            <p className="mt-2 text-white/75">A scoping call is the first step — no commitment required.</p>
          </div>
          <CtaButton href={service.cta.href} variant="gold">
            {service.cta.label}
          </CtaButton>
        </Container>
      </section>
    </>
  );
}
`;

{
  const file = p("components", "ServiceDomainTemplate.tsx");
  const { text } = readText(file);
  const crlf = fs.readFileSync(file, "utf8").includes("\r\n");

  if (text.includes("service.overview")) {
    record("skip", "components/ServiceDomainTemplate.tsx: already updated");
  } else if (text.includes("export default function ServiceDomainTemplate")) {
    writeText(file, NEW_TEMPLATE, crlf);
    record("done", "components/ServiceDomainTemplate.tsx: now renders the richer sections when present");
  } else {
    fail(
      "components/ServiceDomainTemplate.tsx doesn't look like the original template.\n" +
        "  Nothing else has been changed beyond lib/site-data.ts. Aborting before overwriting it."
    );
  }
}

// ---------------------------------------------------------------------------
// Step 3: three new page files
// ---------------------------------------------------------------------------
function pageSource(slug, componentName) {
  return `import type { Metadata } from "next";
import ServiceDomainTemplate from "@/components/ServiceDomainTemplate";
import { serviceDomains } from "@/lib/site-data";

const service = serviceDomains.find((s) => s.slug === "${slug}")!;

export const metadata: Metadata = {
  title: service.name,
  description: service.description,
};

export default function ${componentName}() {
  return <ServiceDomainTemplate service={service} />;
}
`;
}

const pages = [
  [SLUGS.intercom, "IntercomVoipInstallationPage"],
  [SLUGS.lan, "OfficeHomeLanWanInstallationPage"],
  [SLUGS.cctv, "CctvCameraInstallationPage"],
];

for (const [slug, componentName] of pages) {
  const file = p("app", "services", slug, "page.tsx");
  if (fs.existsSync(file)) {
    record("skip", `app/services/${slug}/page.tsx: already exists`);
  } else {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, pageSource(slug, componentName), "utf8");
    record("done", `app/services/${slug}/page.tsx: created`);
  }
}

// ---------------------------------------------------------------------------
// Step 4: copy edits (cosmetic, non-fatal if a line has since been reworded)
// ---------------------------------------------------------------------------
function copyEdit(relPath, edits) {
  const file = p(...relPath.split("/"));
  let { text, crlf } = readText(file);
  let changed = false;
  for (const { from, to, label } of edits) {
    if (text.includes(to)) {
      record("skip", `${relPath}: ${label} already updated`);
    } else if (count(text, from) === 1) {
      text = text.replace(from, to);
      changed = true;
      record("done", `${relPath}: ${label} updated`);
    } else {
      warnings.push(`${relPath}: couldn't find the ${label} text to update. Reword it by hand if it still says "five".`);
    }
  }
  if (changed) writeText(file, text, crlf);
}

copyEdit("app/services/page.tsx", [
  {
    label: "page heading",
    from: "Consulting across five core domains",
    to: "Consulting and installation services",
  },
  {
    label: "intro sentence",
    from: "Each domain is delivered as a standalone engagement or combined into a broader program",
    to: "Each service is delivered as a standalone engagement or combined into a broader program",
  },
  {
    label: "meta description",
    from: "Cloud, DevOps, Cybersecurity, Networking & IT Infrastructure, and Linux Server Administration consulting services from StackPrime Consulting Ltd.",
    to: "Cloud, DevOps, Cybersecurity, Networking & IT Infrastructure, and Linux Server Administration consulting, plus Intercom / VoIP, LAN/WAN, and CCTV installation services from StackPrime Consulting Ltd.",
  },
]);

copyEdit("app/page.tsx", [
  {
    label: "services section heading",
    from: "Five domains. One standard of delivery.",
    to: "Consulting and installation. One standard of delivery.",
  },
]);

// ---------------------------------------------------------------------------
// Step 5: image check
// ---------------------------------------------------------------------------
const missingImages = Object.values(IMAGES).filter(
  (name) => !fs.existsSync(p("public", "images", name))
);

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
console.log("\nStackPrime: add installation services\n");
for (const { status, message } of summary) {
  console.log(`  ${status === "done" ? "✓" : "·"} ${message}${status === "skip" ? "  (skipped)" : ""}`);
}

if (warnings.length > 0) {
  console.log("\nHeads-up:");
  for (const w of warnings) console.log(`  ! ${w}`);
}

if (missingImages.length > 0) {
  console.log("\nImages still needed. Save them into public/images/ with these exact names:");
  for (const name of missingImages) console.log(`  - public/images/${name}`);
  console.log("  Until they're added, the new pages will show a dark banner and a broken image slot.");
} else {
  console.log("\n✓ All three images found in public/images/");
}

console.log("\nNext steps:");
console.log("  1. git diff                  (review exactly what changed)");
console.log("  2. npm run dev               (then open /services and the three new pages)");
console.log(`  3. /services/${SLUGS.intercom}`);
console.log(`     /services/${SLUGS.lan}`);
console.log(`     /services/${SLUGS.cctv}\n`);
