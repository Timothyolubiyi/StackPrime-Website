#!/usr/bin/env node
/**
 * expand-services.mjs
 *
 * Replaces the Cloud Computing, Cybersecurity, Networking & IT Infrastructure,
 * and Linux Server Administration entries in lib/site-data.ts with
 * comprehensive versions covering every sub-service you listed, including
 * overview copy, a full "what we deliver" feature grid, a process section,
 * and an "ideal for" section. DevOps Engineering and the three installation
 * services (Intercom/VoIP, LAN/WAN, CCTV) are untouched.
 *
 * Existing images (cloud-computing.jpg, cybersecurity-1.jpg, networking-1.jpg,
 * linux-server-admin.jpg) are kept as-is. Swap in new ones later by changing
 * the `image:` line for each service in lib/site-data.ts, or tell me the
 * filenames and I'll give you a follow-up script.
 *
 * Usage (run from your marketing site's root folder):
 *   node expand-services.mjs
 *   node expand-services.mjs path/to/marketing-site
 *
 * Safe to run more than once — detects whether each service has already
 * been expanded and skips it if so.
 */

import fs from "node:fs";
import path from "node:path";

const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const p = (...segments) => path.join(root, ...segments);

function readText(file) {
  const raw = fs.readFileSync(file, "utf8");
  const crlf = raw.includes("\r\n");
  return { text: crlf ? raw.replace(/\r\n/g, "\n") : raw, crlf };
}
function writeText(file, text, crlf) {
  fs.writeFileSync(file, crlf ? text.replace(/\n/g, "\r\n") : text, "utf8");
}
function fail(message) {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

const summary = [];
const record = (status, message) => summary.push({ status, message });

const file = p("lib", "site-data.ts");
if (!fs.existsSync(file)) {
  fail(
    `Could not find ${path.relative(root, file)} under ${root}\n` +
      "  Run this from your marketing site's root folder, or pass the folder path:\n" +
      "  node expand-services.mjs path/to/marketing-site"
  );
}

let { text: source, crlf } = readText(file);

/**
 * Finds the object literal in `source` whose `slug: "<slug>"` field matches,
 * and replaces the ENTIRE object (from its opening `{` to its matching
 * closing `}`, including a trailing comma) with `newEntryText`.
 * Uses brace-depth counting rather than literal text matching, so it works
 * regardless of minor wording differences in the current file.
 */
function replaceServiceEntry(src, slug, newEntryText) {
  const marker = `slug: "${slug}"`;
  const markerIdx = src.indexOf(marker);
  if (markerIdx === -1) return { ok: false };

  const start = src.lastIndexOf("{", markerIdx);
  if (start === -1) return { ok: false };

  let depth = 0;
  let i = start;
  for (; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") {
      depth--;
      if (depth === 0) {
        i++;
        break;
      }
    }
  }
  let end = i;
  if (src[end] === ",") end++;

  const before = src.slice(0, start);
  const after = src.slice(end);
  return { ok: true, text: before + newEntryText + after };
}

function alreadyExpanded(src, slug, sentinel) {
  // crude but effective: check the sentinel string appears after this
  // service's slug marker and before the next top-level service's slug
  // (good enough since sentinels are unique strings only used here).
  return src.includes(sentinel);
}

// ---------------------------------------------------------------------------
// Shared process steps (reused with per-service wording)
// ---------------------------------------------------------------------------
function processSteps(a, b, c, d) {
  return `[
      { title: "Discovery & Assessment", description: "${a}" },
      { title: "Design & Proposal", description: "${b}" },
      { title: "Implementation & Configuration", description: "${c}" },
      { title: "Testing, Documentation & Handover", description: "${d}" },
    ]`;
}

// ---------------------------------------------------------------------------
// 1. Cloud Computing
// ---------------------------------------------------------------------------
const CLOUD_ENTRY = `  {
    slug: "cloud-computing",
    name: "Cloud Computing",
    shortName: "Cloud",
    eyebrow: "Consulting Services",
    tagline: "Cloud infrastructure built for where you're growing, not just where you are.",
    description:
      "We design, migrate, and manage cloud environments across AWS, Azure, and GCP — with cost, security, and scalability planned in from the start rather than fixed after the fact.",
    image: "/images/cloud-computing.jpg",
    imageAlt: "Cloud computing infrastructure",
    overview: [
      "StackPrime provides end-to-end cloud computing services — from first strategy conversation through architecture, migration, automation, and ongoing administration — across AWS, Microsoft Azure, and Google Cloud Platform. Whether you're moving your first workload to the cloud or already running multi-cloud and need it managed properly, engagements are scoped to your actual environment rather than a fixed package.",
      "Infrastructure is built as code wherever practical — Terraform for provisioning, Ansible for configuration management — so environments are repeatable, auditable, and don't rely on tribal knowledge of what was clicked in a console. CI/CD pipelines connect that infrastructure to how your team actually ships software, so deployment is a routine process, not an event.",
      "Security, identity and access management, and cost control are treated as part of the architecture from day one, not an afterthought bolted on after launch. Whether you're running fully in the cloud, split across providers, or connecting cloud to infrastructure you still run on-premise, the goal is the same: a cloud environment you understand, can afford, and can maintain.",
    ],
    subServices: [
      { name: "Cloud Strategy and Infrastructure Consulting" },
      { name: "AWS Cloud Architecture and Deployment" },
      { name: "Microsoft Azure Infrastructure Deployment" },
      { name: "Google Cloud Platform (GCP) Consulting" },
      { name: "Cloud Migration and Modernization" },
      { name: "Cloud Networking, VPCs and Virtual Networks" },
      { name: "Cloud Identity and Access Management" },
      { name: "Cloud Security Configuration and Monitoring" },
      { name: "Cloud Server and Virtual Machine Deployment" },
      { name: "Cloud Storage and Backup Solutions" },
      { name: "High Availability and Disaster Recovery Design" },
      { name: "Infrastructure as Code (Terraform)" },
      { name: "Configuration Management with Ansible" },
      { name: "CI/CD Pipeline Design and Implementation" },
      { name: "Cloud Cost Optimization" },
      { name: "Cloud Monitoring, Logging and Alerting" },
      { name: "Application Deployment and Hosting" },
      { name: "Hybrid Cloud Infrastructure Consulting" },
      { name: "Cloud Governance and Compliance Advisory" },
      { name: "Cloud Administration Training and Mentorship" },
    ],
    features: [
      { title: "Cloud Strategy and Infrastructure Consulting", description: "Assessing your current environment and mapping a cloud roadmap suited to your goals, budget, and risk tolerance." },
      { title: "AWS Cloud Architecture and Deployment", description: "Designing and deploying AWS environments — EC2, VPC, IAM, S3, RDS — sized to what your workload actually needs." },
      { title: "Microsoft Azure Infrastructure Deployment", description: "Azure resource groups, virtual networks, and compute and storage services deployed and configured for production use." },
      { title: "Google Cloud Platform (GCP) Consulting", description: "GCP project setup, compute and networking configuration, and architecture guidance for workloads on Google Cloud." },
      { title: "Cloud Migration and Modernization", description: "Moving on-premise or legacy systems to the cloud, re-architecting where it makes sense rather than a straight lift-and-shift." },
      { title: "Cloud Networking, VPCs and Virtual Networks", description: "Virtual network design, subnetting, peering, and routing across your cloud environments." },
      { title: "Cloud Identity and Access Management", description: "IAM roles, policies, and least-privilege access control across cloud accounts and services." },
      { title: "Cloud Security Configuration and Monitoring", description: "Security group and policy configuration, with ongoing monitoring for misconfigurations and emerging threats." },
      { title: "Cloud Server and Virtual Machine Deployment", description: "Provisioning and configuring virtual machines sized and secured for your actual workloads." },
      { title: "Cloud Storage and Backup Solutions", description: "Object, block, and file storage configured with backup and retention policies that match your recovery needs." },
      { title: "High Availability and Disaster Recovery Design", description: "Architecture that keeps services running through failures, with recovery plans tested, not assumed." },
      { title: "Infrastructure as Code (Terraform)", description: "Infrastructure defined, versioned, and provisioned as code, so environments are repeatable and auditable." },
      { title: "Configuration Management with Ansible", description: "Automated, consistent server configuration across your fleet using Ansible playbooks." },
      { title: "CI/CD Pipeline Design and Implementation", description: "Automated build, test, and deployment pipelines that get code to production reliably." },
      { title: "Cloud Cost Optimization", description: "Rightsizing resources, reserved capacity planning, and eliminating waste in your cloud bill." },
      { title: "Cloud Monitoring, Logging and Alerting", description: "Visibility into performance and health, with alerts that reach you before small issues become outages." },
      { title: "Application Deployment and Hosting", description: "Deploying and hosting applications on cloud infrastructure built around the way they actually run." },
      { title: "Hybrid Cloud Infrastructure Consulting", description: "Architecture connecting on-premise systems with cloud environments where a full migration isn't the goal." },
      { title: "Cloud Governance and Compliance Advisory", description: "Policies and controls that keep cloud usage aligned with your compliance and governance requirements." },
      { title: "Cloud Administration Training and Mentorship", description: "Hands-on training so your team can operate and maintain the cloud environment with confidence." },
    ],
    process: ${processSteps(
      "We review your current infrastructure, workloads, and goals to understand what the cloud environment actually needs to do.",
      "A clear architecture and migration or build plan, covering provider choice, cost, security, and timeline.",
      "Infrastructure provisioned as code, networking and security configured, and workloads deployed or migrated.",
      "Monitoring and alerting verified, documentation handed over, and your team walked through how it all works."
    )},
    idealFor: [
      "Businesses planning their first move to the cloud",
      "Companies running multi-cloud, or wanting a second opinion on existing architecture",
      "Teams wanting Infrastructure-as-Code and CI/CD maturity instead of manual, undocumented changes",
      "Organizations needing cost optimization on an already-running cloud bill",
      "Teams needing hands-on cloud administration training",
    ],
    ctaHeading: "Ready to plan your cloud infrastructure?",
    cta: { label: "Book a Consultation", href: "/company/contact" },
  },`;

// ---------------------------------------------------------------------------
// 2. Cybersecurity
// ---------------------------------------------------------------------------
const CYBERSECURITY_ENTRY = `  {
    slug: "cybersecurity",
    name: "Cybersecurity",
    shortName: "Cybersecurity",
    eyebrow: "Consulting Services",
    tagline: "Standards-aligned security assessment, monitoring, and governance.",
    description:
      "We help organizations protect digital assets, reduce security risks, strengthen defenses, and improve security posture — from assessment through monitoring, incident response, and compliance advisory.",
    image: "/images/cybersecurity-1.jpg",
    imageAlt: "Cybersecurity operations and monitoring",
    overview: [
      "StackPrime's cybersecurity practice exists to help organizations protect digital assets, reduce security risk, strengthen defenses, and measurably improve security posture — not to sell a one-time scan and move on. Engagements range from a focused vulnerability assessment through to ongoing security monitoring, incident response readiness, and compliance advisory.",
      "Work is grounded in recognized standards and frameworks — OWASP, NIST SP 800-115, the NIST Cybersecurity Framework, CIS Controls v8, and ISO/IEC 27001 — so findings are defensible, comparable over time, and understood by both technical teams and leadership. Security is addressed at every layer: network, endpoint, server, cloud, identity, and the software delivery pipeline itself.",
      "Because security isn't a project with an end date, the practice covers the full lifecycle — assessment and hardening, detection and monitoring, incident response and remediation, and the governance and training that keep improvements from quietly eroding over time.",
    ],
    subServices: [
      { name: "Vulnerability Assessment and Penetration Testing (VAPT)" },
      { name: "Security Audits and Risk Assessments" },
      { name: "Network Security Architecture and Implementation" },
      { name: "Firewall Configuration and Management" },
      { name: "Endpoint Security and Hardening" },
      { name: "Linux and Windows Server Hardening" },
      { name: "Identity and Access Management (IAM)" },
      { name: "Multi-Factor Authentication (MFA) Implementation" },
      { name: "Security Monitoring and Incident Detection" },
      { name: "Security Incident Response and Remediation" },
      { name: "Log Management and SIEM Implementation" },
      { name: "Cloud Security Assessment and Hardening" },
      { name: "DevSecOps and CI/CD Pipeline Security" },
      { name: "Infrastructure-as-Code (IaC) Security" },
      { name: "ISO 27001 Readiness and Security Controls Advisory" },
      { name: "NIST Cybersecurity Framework Advisory" },
      { name: "Backup Security and Disaster Recovery Planning" },
      { name: "Security Awareness and Technical Training" },
    ],
    features: [
      { title: "Vulnerability Assessment and Penetration Testing (VAPT)", description: "Identifying and validating security weaknesses across networks, applications, and infrastructure before attackers do." },
      { title: "Security Audits and Risk Assessments", description: "Structured review of your security posture against recognized standards, with findings ranked by actual risk." },
      { title: "Network Security Architecture and Implementation", description: "Designing and implementing network security controls that keep threats out and traffic properly segmented." },
      { title: "Firewall Configuration and Management", description: "Rule design, review, and ongoing management so firewalls enforce policy, not just sit there configured once." },
      { title: "Endpoint Security and Hardening", description: "Hardening workstations, laptops, and servers against common attack techniques." },
      { title: "Linux and Windows Server Hardening", description: "Security baseline configuration for Linux and Windows servers, closing down unnecessary exposure." },
      { title: "Identity and Access Management (IAM)", description: "Access control design so the right people have the right access, and no more." },
      { title: "Multi-Factor Authentication (MFA) Implementation", description: "Rolling out MFA across critical systems to stop credential-based attacks." },
      { title: "Security Monitoring and Incident Detection", description: "Ongoing monitoring to catch suspicious activity early, not after the damage is done." },
      { title: "Security Incident Response and Remediation", description: "A clear, practiced response when something does go wrong, from containment through remediation." },
      { title: "Log Management and SIEM Implementation", description: "Centralized logging and SIEM setup so security events are visible and properly correlated." },
      { title: "Cloud Security Assessment and Hardening", description: "Reviewing and hardening cloud environments against misconfiguration and common cloud attack paths." },
      { title: "DevSecOps and CI/CD Pipeline Security", description: "Security built into the pipeline itself, not bolted on after deployment." },
      { title: "Infrastructure-as-Code (IaC) Security", description: "Scanning and reviewing IaC templates for security issues before they're provisioned." },
      { title: "ISO 27001 Readiness and Security Controls Advisory", description: "Preparing your organization's controls and documentation for ISO 27001 alignment." },
      { title: "NIST Cybersecurity Framework Advisory", description: "Mapping your security program against the NIST CSF and closing identified gaps." },
      { title: "Backup Security and Disaster Recovery Planning", description: "Making sure backups are themselves secure, tested, and able to actually recover you." },
      { title: "Security Awareness and Technical Training", description: "Training for both end users and technical teams, building security habits that actually stick." },
    ],
    process: ${processSteps(
      "We assess your current security posture, assets, and risk areas to understand what matters most to protect.",
      "A scoped plan covering methodology, standards referenced, and deliverables, with cost agreed upfront.",
      "Assessment, hardening, or monitoring setup carried out hands-on, with findings documented as we go.",
      "A findings report with severity ratings, remediation guidance, and an executive summary for leadership."
    )},
    idealFor: [
      "Businesses needing a VAPT or security assessment",
      "Companies preparing for ISO 27001 or similar compliance",
      "Organizations without a formal incident response plan",
      "Teams needing SIEM or centralized log management set up",
      "Businesses wanting ongoing security monitoring rather than a one-time check",
    ],
    ctaHeading: "Ready to request a security assessment?",
    cta: { label: "Request a Security Assessment", href: "/services/vapt-security-assessments" },
  },`;

// ---------------------------------------------------------------------------
// 3. Networking & IT Infrastructure
// ---------------------------------------------------------------------------
const NETWORKING_ENTRY = `  {
    slug: "networking-it-infrastructure",
    name: "Networking & IT Infrastructure",
    shortName: "Networking",
    eyebrow: "Consulting Services",
    tagline: "Networks designed, built, and documented properly — not patched together over time.",
    description:
      "We design, deploy, and support enterprise network infrastructure — LAN, WAN, wireless, routing and switching, VPNs, and structured cabling — built around how your business actually operates.",
    image: "/images/networking-1.jpg",
    imageAlt: "Enterprise network and IT infrastructure",
    overview: [
      "A network that works is one that was designed, not one that accumulated. StackPrime designs and implements enterprise network infrastructure end to end: local and wide area networks, wireless coverage, routing and switching, VPN connectivity, and the structured cabling and fiber underneath all of it — planned around your building, your traffic, and how many people and devices actually depend on it.",
      "Beyond initial deployment, networks are segmented and access-controlled properly — VLANs, firewalls, and network access control configured so a problem in one area doesn't become a problem everywhere. Every installation is documented: IP address management, diagrams, and labelled cabling, so the next change, fault, or expansion doesn't start from guesswork.",
      "For businesses connecting more than one site, or relying on a single internet connection with no fallback, connectivity and redundancy are planned deliberately rather than left to chance — including working directly with ISPs and telecom providers where that relationship is part of the problem.",
    ],
    subServices: [
      { name: "Enterprise Network Design and Implementation" },
      { name: "LAN and WAN Deployment" },
      { name: "Wireless Network Design and Optimization" },
      { name: "Wi-Fi Coverage Planning and Troubleshooting" },
      { name: "Router and Switch Configuration" },
      { name: "VLAN Design and Configuration" },
      { name: "IP Addressing and Subnetting" },
      { name: "Routing and Switching Configuration" },
      { name: "Site-to-Site and Remote-Access VPN" },
      { name: "Firewall and Network Access Control" },
      { name: "Fiber-Optic Network Deployment and Troubleshooting" },
      { name: "Structured Cabling and Rack Installation" },
      { name: "ISP and Telecommunications Network Support" },
      { name: "Network Performance Monitoring and Troubleshooting" },
      { name: "Network Documentation and IP Address Management" },
      { name: "Network Segmentation and Access Control" },
      { name: "Office IT Infrastructure Setup" },
      { name: "Network Audits, Maintenance and Optimization" },
      { name: "Business Internet Connectivity Consulting" },
      { name: "Network Infrastructure Training and Technical Support" },
    ],
    features: [
      { title: "Enterprise Network Design and Implementation", description: "Network architecture planned around how your business actually operates, not a generic template." },
      { title: "LAN and WAN Deployment", description: "Local and wide area network deployment connecting your sites and systems reliably." },
      { title: "Wireless Network Design and Optimization", description: "WiFi designed for your floor plan and device count, not guessed at." },
      { title: "Wi-Fi Coverage Planning and Troubleshooting", description: "Coverage mapping and troubleshooting for dead spots, interference, and capacity issues." },
      { title: "Router and Switch Configuration", description: "Core networking hardware configured correctly from the start." },
      { title: "VLAN Design and Configuration", description: "Traffic segmented logically for both security and performance." },
      { title: "IP Addressing and Subnetting", description: "Clean, scalable IP address planning that doesn't require a redesign as you grow." },
      { title: "Routing and Switching Configuration", description: "Routing and switching configured for reliable, predictable traffic flow." },
      { title: "Site-to-Site and Remote-Access VPN", description: "Secure connections between sites, and for remote staff connecting in." },
      { title: "Firewall and Network Access Control", description: "Perimeter and internal access control that enforces your actual security policy." },
      { title: "Fiber-Optic Network Deployment and Troubleshooting", description: "Fiber installation and fault-finding for high-capacity, long-distance links." },
      { title: "Structured Cabling and Rack Installation", description: "Neat, labelled cabling and rack work that holds up over time." },
      { title: "ISP and Telecommunications Network Support", description: "Support liaising with your internet and telecom providers when issues arise." },
      { title: "Network Performance Monitoring and Troubleshooting", description: "Ongoing visibility into network health, with troubleshooting when something's wrong." },
      { title: "Network Documentation and IP Address Management", description: "Up-to-date network diagrams and IP records, so changes don't start from guesswork." },
      { title: "Network Segmentation and Access Control", description: "Isolating critical systems from general traffic to limit what a breach can reach." },
      { title: "Office IT Infrastructure Setup", description: "Full office network and IT infrastructure setup for new or relocating premises." },
      { title: "Network Audits, Maintenance and Optimization", description: "Periodic review and tuning so the network keeps pace with how you actually use it." },
      { title: "Business Internet Connectivity Consulting", description: "Guidance on the right internet connectivity and redundancy for your business." },
      { title: "Network Infrastructure Training and Technical Support", description: "Training and ongoing support so your team can manage day-to-day network needs." },
    ],
    process: ${processSteps(
      "We assess your building, existing infrastructure, device counts, and connectivity needs before recommending anything.",
      "A clear network design covering topology, equipment, cabling scope, and cost.",
      "Cabling, equipment mounting, and configuration, carried out with minimal disruption to your working day.",
      "Every link tested, everything labelled and documented, and a walkthrough for your team."
    )},
    idealFor: [
      "Businesses setting up or relocating an office network",
      "Companies needing reliable WAN connectivity between multiple sites",
      "Organizations with WiFi coverage or performance issues",
      "Businesses needing structured cabling, rack work, or fiber installation",
      "Teams wanting ongoing network support rather than ad-hoc fixes",
    ],
    ctaHeading: "Ready to plan your network infrastructure?",
    cta: { label: "Book a Consultation", href: "/company/contact" },
  },`;

// ---------------------------------------------------------------------------
// 4. Linux Server Administration
// ---------------------------------------------------------------------------
const LINUX_ENTRY = `  {
    slug: "linux-server-administration",
    name: "Linux Server Administration",
    shortName: "Linux Admin",
    eyebrow: "Consulting Services",
    tagline: "Servers that are hardened, maintained, and never an afterthought.",
    description:
      "We deliver Linux server installation, configuration, security, application hosting, and ongoing administration for business and development environments.",
    image: "/images/linux-server-admin.jpg",
    imageAlt: "Linux server administration",
    overview: [
      "StackPrime delivers Linux server installation, configuration, security, application hosting, and ongoing administration for business and development environments — across Ubuntu, Debian, and RHEL-compatible distributions. Work covers everything from a clean first install through to years of day-to-day administration, hardening, and troubleshooting.",
      "Servers are configured correctly from first boot: users, groups and permissions set up deliberately, SSH locked down for secure remote administration, and firewalls (UFW or firewalld) enforcing policy at the host level. Web server deployment (Apache or Nginx), virtual host configuration, domain and SSL/TLS setup, and database administration (MySQL/MariaDB) are handled as a complete hosting environment, not disconnected pieces.",
      "Beyond initial setup, the work that actually protects uptime over time is covered too — backup and tested disaster recovery, log analysis and troubleshooting, performance monitoring, security hardening and auditing, and migration or upgrade when it's time to move on. Where repetitive administrative work can be automated, it is, through Bash scripting and systemd service management rather than manual repetition.",
    ],
    subServices: [
      { name: "Linux Server Installation and Configuration" },
      { name: "Ubuntu, Debian and RHEL-Compatible Server Administration" },
      { name: "Virtual Machine Setup Using VirtualBox and KVM" },
      { name: "User, Group and Permission Management" },
      { name: "Linux Package and Software Management" },
      { name: "SSH Configuration and Secure Remote Administration" },
      { name: "Linux Networking and DNS Configuration" },
      { name: "Apache and Nginx Web Server Deployment" },
      { name: "Website Hosting and Virtual Host Configuration" },
      { name: "Domain and SSL/TLS Certificate Configuration" },
      { name: "MySQL and MariaDB Installation and Administration" },
      { name: "Database Backup and Recovery" },
      { name: "Linux Firewall Configuration (UFW and firewalld)" },
      { name: "Server Hardening and Security Auditing" },
      { name: "Bash Scripting for Administrative Tasks" },
      { name: "Systemd Services and Process Management" },
      { name: "Log Analysis and Troubleshooting" },
      { name: "Server Performance Monitoring and Optimization" },
      { name: "Backup, Restore and Disaster Recovery" },
      { name: "Linux Server Migration and Upgrade" },
      { name: "Reverse Proxy and Web Application Deployment" },
      { name: "Production Server Setup and Maintenance" },
      { name: "Linux Administration Training and Mentorship" },
    ],
    features: [
      { title: "Linux Server Installation and Configuration", description: "Clean, correctly configured server builds from first boot." },
      { title: "Ubuntu, Debian and RHEL-Compatible Server Administration", description: "Administration across the Linux distributions your business actually runs." },
      { title: "Virtual Machine Setup Using VirtualBox and KVM", description: "Virtualized Linux environments for development, testing, or production." },
      { title: "User, Group and Permission Management", description: "Access control structured correctly from the start, not left to default permissions." },
      { title: "Linux Package and Software Management", description: "Software installed, updated, and managed cleanly across your servers." },
      { title: "SSH Configuration and Secure Remote Administration", description: "Remote access configured and locked down against common attack vectors." },
      { title: "Linux Networking and DNS Configuration", description: "Network interfaces, routing, and DNS configured correctly for reliable connectivity." },
      { title: "Apache and Nginx Web Server Deployment", description: "Web server setup and tuning for the traffic and applications you actually run." },
      { title: "Website Hosting and Virtual Host Configuration", description: "Multiple sites or applications hosted cleanly on shared infrastructure." },
      { title: "Domain and SSL/TLS Certificate Configuration", description: "Domains pointed correctly and HTTPS configured — and kept renewed." },
      { title: "MySQL and MariaDB Installation and Administration", description: "Database installation, tuning, and day-to-day administration." },
      { title: "Database Backup and Recovery", description: "Backup schedules and tested recovery procedures, not just a cron job and hope." },
      { title: "Linux Firewall Configuration (UFW and firewalld)", description: "Host-level firewall rules that enforce policy on each server." },
      { title: "Server Hardening and Security Auditing", description: "Hardening against common misconfigurations, with periodic audits to catch drift." },
      { title: "Bash Scripting for Administrative Tasks", description: "Automation scripts that remove repetitive manual work." },
      { title: "Systemd Services and Process Management", description: "Services configured to start, restart, and log correctly under systemd." },
      { title: "Log Analysis and Troubleshooting", description: "Digging into logs to find the actual cause, not just the symptom." },
      { title: "Server Performance Monitoring and Optimization", description: "Monitoring and tuning so performance issues are caught early and addressed." },
      { title: "Backup, Restore and Disaster Recovery", description: "Full-server backup and recovery planning, tested before you need it." },
      { title: "Linux Server Migration and Upgrade", description: "Moving servers to new infrastructure or upgrading distributions without unplanned downtime." },
      { title: "Reverse Proxy and Web Application Deployment", description: "Reverse proxy setup with Nginx or Apache for applications and APIs running behind it." },
      { title: "Production Server Setup and Maintenance", description: "Production environments set up correctly and maintained on an ongoing basis." },
      { title: "Linux Administration Training and Mentorship", description: "Hands-on training so your team can administer Linux servers with confidence." },
    ],
    process: ${processSteps(
      "We review your current servers, applications, and requirements to understand what the environment needs to do.",
      "A clear plan covering distribution choice, server sizing, hosting architecture, and cost.",
      "Server builds, hardening, hosting, and database setup carried out carefully, with minimal disruption.",
      "Performance and security verified, documentation handed over, and your team walked through day-to-day administration."
    )},
    idealFor: [
      "Businesses needing a production Linux server set up correctly from the start",
      "Companies hosting websites or applications that need reliable uptime",
      "Teams needing database administration and real backup discipline",
      "Organizations wanting server hardening and security auditing",
      "Teams needing hands-on Linux administration training",
    ],
    ctaHeading: "Ready to plan your Linux server setup?",
    cta: { label: "Book a Consultation", href: "/company/contact" },
  },`;

// ---------------------------------------------------------------------------
// Apply
// ---------------------------------------------------------------------------
const jobs = [
  { slug: "cloud-computing", entry: CLOUD_ENTRY, sentinel: 'title: "Cloud Administration Training and Mentorship"', label: "Cloud Computing" },
  { slug: "cybersecurity", entry: CYBERSECURITY_ENTRY, sentinel: 'title: "Security Awareness and Technical Training"', label: "Cybersecurity" },
  { slug: "networking-it-infrastructure", entry: NETWORKING_ENTRY, sentinel: 'title: "Network Infrastructure Training and Technical Support"', label: "Networking & IT Infrastructure" },
  { slug: "linux-server-administration", entry: LINUX_ENTRY, sentinel: 'title: "Linux Administration Training and Mentorship"', label: "Linux Server Administration" },
];

for (const job of jobs) {
  if (source.includes(job.sentinel)) {
    record("skip", `${job.label}: already expanded`);
    continue;
  }
  const result = replaceServiceEntry(source, job.slug, job.entry);
  if (!result.ok) {
    record("fail", `${job.label}: couldn't find a service with slug "${job.slug}" in lib/site-data.ts`);
    continue;
  }
  source = result.text;
  record("done", `${job.label}: expanded with full sub-service list, features, process, and ideal-for sections`);
}

const anyFail = summary.some((s) => s.status === "fail");
if (anyFail) {
  console.log("\nStackPrime: expand service pages — STOPPED, nothing was written\n");
  for (const { status, message } of summary) {
    console.log(`  ${status === "fail" ? "✗" : status === "done" ? "✓" : "·"} ${message}`);
  }
  console.log("\nNo changes were saved because at least one service couldn't be found.");
  console.log("lib/site-data.ts may have been restructured since this script was written.\n");
  process.exit(1);
}

writeText(file, source, crlf);

console.log("\nStackPrime: expand service pages\n");
for (const { status, message } of summary) {
  console.log(`  ${status === "done" ? "✓" : "·"} ${message}${status === "skip" ? "  (skipped)" : ""}`);
}
console.log("\nNext steps:");
console.log("  1. git diff lib/site-data.ts      (review exactly what changed)");
console.log("  2. npm run dev                     (then open each of the four service pages)");
console.log("  3. /services/cloud-computing");
console.log("     /services/cybersecurity");
console.log("     /services/networking-it-infrastructure");
console.log("     /services/linux-server-administration\n");
