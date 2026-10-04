// Central content model for site structure, so the mega-menu, footer, and
// service pages all read from one place rather than duplicating copy.

export type SubService = {
  name: string;
};

export type ServiceCatalogItem = {
  title: string;
  description: string;
  image: string;
  imageAlt: string;
};

export type ServiceDomain = {
  slug: string;
  name: string;
  shortName: string;
  eyebrow?: string;      // required: every service has one
  tagline: string;
  imageAlt?: string;      // optional: only some services have one, keep your other existing fields here
  description: string;
  overview: string[];
  features: { title: string; description: string }[];
  process: { title: string; description: string }[];
  idealFor: string[];
  ctaHeading?: string;
  
  image: string;
  subServices: SubService[];
  cta: { label: string; href: string };
};

export const serviceDomains: ServiceDomain[] = [
    {
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
    process: [
      { title: "Discovery & Assessment", description: "We review your current infrastructure, workloads, and goals to understand what the cloud environment actually needs to do." },
      { title: "Design & Proposal", description: "A clear architecture and migration or build plan, covering provider choice, cost, security, and timeline." },
      { title: "Implementation & Configuration", description: "Infrastructure provisioned as code, networking and security configured, and workloads deployed or migrated." },
      { title: "Testing, Documentation & Handover", description: "Monitoring and alerting verified, documentation handed over, and your team walked through how it all works." },
    ],
    idealFor: [
      "Businesses planning their first move to the cloud",
      "Companies running multi-cloud, or wanting a second opinion on existing architecture",
      "Teams wanting Infrastructure-as-Code and CI/CD maturity instead of manual, undocumented changes",
      "Organizations needing cost optimization on an already-running cloud bill",
      "Teams needing hands-on cloud administration training",
    ],
    ctaHeading: "Ready to plan your cloud infrastructure?",
    cta: { label: "Book a Consultation", href: "/company/contact" },
  },
  {
    slug: "devops-engineering",
    name: "DevOps Engineering",
    shortName: "DevOps",
    eyebrow: "Consulting, Automation & Engineering",
    tagline:
      "Build reliable delivery pipelines, automate infrastructure, and release software with greater confidence.",
    description:
      "StackPrime Consulting helps organizations modernize software delivery and infrastructure operations through DevOps engineering, CI/CD automation, Infrastructure as Code, containerization, cloud deployment, DevSecOps, monitoring, and operational reliability. We design practical, repeatable workflows that reduce manual effort, improve consistency, and support secure, scalable growth.",
    image: "/images/devops-1.jpg",
    imageAlt:
      "DevOps engineering with automated delivery pipelines and infrastructure",

    overview: [
      "DevOps is more than a collection of tools. It is a way of connecting software development, infrastructure operations, security, and service management so that organizations can deliver changes reliably and maintain their applications with confidence. StackPrime Consulting helps teams assess their current delivery practices, identify operational bottlenecks, and implement automation suited to their applications, infrastructure, and business objectives.",

      "Our CI/CD engineering services cover the design, implementation, and improvement of automated workflows for source control, code validation, testing, artifact management, deployment, and release verification. Using appropriate tools such as Jenkins and GitHub Actions, we help establish repeatable delivery processes, environment-specific controls, and documented recovery procedures. The goal is to make software releases more consistent, traceable, and manageable.",

      "We use Infrastructure as Code and configuration management to reduce dependence on manual infrastructure changes. Terraform or OpenTofu can be used to define and provision supported infrastructure, while Ansible can automate server configuration, software installation, and operational tasks. Version-controlled configurations, peer review, and environment separation help make infrastructure changes easier to understand, reproduce, and audit.",

      "For container-based applications, we provide Docker containerization, image management, deployment configuration, and Kubernetes orchestration support where appropriate. We can help teams structure container workloads, manage application configuration and secrets, configure health checks, and plan deployments around availability and operational requirements. Architecture and platform choices are based on the actual workload rather than adopting complexity without a clear need.",

      "Cloud DevOps services help organizations automate and operate workloads across AWS, Microsoft Azure, and Google Cloud Platform. Engagements can include cloud infrastructure provisioning, networking and identity configuration, automated deployment, environment management, cloud monitoring, backup planning, and cost-conscious resource design. We also support hybrid environments where cloud resources must integrate with existing systems.",

      "Security is incorporated into delivery and infrastructure workflows through DevSecOps practices. Depending on project scope, this may include dependency and container image scanning, static code analysis, Infrastructure-as-Code security checks, secrets detection, access controls, approval gates, and audit-friendly deployment records. Security controls are selected to fit the application's risk profile and the organization's requirements.",

      "Reliable operations require visibility into what applications and infrastructure are doing. We help teams establish useful monitoring, centralized logging, health checks, metrics, dashboards, and alerting. We also support Site Reliability Engineering practices such as service-level indicators, service-level objectives, incident investigation, capacity planning, recovery testing, and post-incident improvement where these practices suit the service.",

      "Our work includes knowledge transfer and operational enablement. We provide implementation documentation, deployment runbooks, troubleshooting guidance, and practical training to help internal teams understand, operate, and maintain the environments delivered. Engagements can range from a focused pipeline improvement to a broader DevOps transformation roadmap."
    ],

    features: [
      {
        title: "DevOps Strategy and Maturity Assessment",
        description:
          "Review existing development, deployment, infrastructure, and operational practices; identify bottlenecks; and develop a prioritized roadmap for automation, collaboration, reliability, and continuous improvement."
      },
      {
        title: "CI/CD Pipeline Design and Implementation",
        description:
          "Design and implement automated workflows using Jenkins, GitHub Actions, and suitable integrations for source control, build, testing, artifact creation, deployment, approvals, and release verification."
      },
      {
        title: "Git Workflow and Release Engineering",
        description:
          "Establish practical branching, pull-request, code-review, versioning, release-tagging, artifact-retention, and promotion practices to improve traceability and control across development and production."
      },
      {
        title: "Infrastructure as Code",
        description:
          "Define and manage infrastructure using Terraform or OpenTofu, with reusable modules, environment-specific configuration, controlled state management, reviewed changes, and repeatable provisioning workflows."
      },
      {
        title: "Configuration Management and Automation",
        description:
          "Use Ansible and related automation practices for server configuration, package installation, application setup, system hardening, patching workflows, and repeatable operational tasks."
      },
      {
        title: "Docker and Containerization",
        description:
          "Containerize applications, develop maintainable Dockerfiles, configure multi-stage builds, manage runtime settings, and establish image versioning and deployment practices suitable for each workload."
      },
      {
        title: "Kubernetes and Container Orchestration",
        description:
          "Support Kubernetes deployment architecture, workload configuration, services, ingress, resource requests and limits, health probes, rollout strategies, and operational troubleshooting. Managed platforms such as Amazon EKS can be considered when required."
      },
      {
        title: "GitOps and Continuous Delivery",
        description:
          "Implement Git-driven deployment and configuration workflows using tools such as Argo CD where appropriate, with reviewed changes, environment promotion, deployment reconciliation, and a clear audit trail."
      },
      {
        title: "Cloud DevOps Engineering",
        description:
          "Automate cloud infrastructure and application delivery across AWS, Azure, and GCP, including suitable compute, networking, identity, storage, deployment, monitoring, and environment-management services."
      },
      {
        title: "DevSecOps and Pipeline Security",
        description:
          "Integrate appropriate security controls into development and delivery workflows, including dependency analysis, static analysis, image scanning, secrets detection, IaC scanning, least-privilege access, and controlled deployment approvals."
      },
      {
        title: "Secrets and Configuration Management",
        description:
          "Separate application configuration from source code, manage environment-specific settings, reduce accidental credential exposure, and integrate appropriate secret-management mechanisms into deployment workflows."
      },
      {
        title: "Infrastructure and Application Monitoring",
        description:
          "Establish health checks, metrics, logs, dashboards, and actionable alerts to help teams identify service degradation, investigate failures, and understand infrastructure and application behavior."
      },
      {
        title: "Site Reliability Engineering",
        description:
          "Apply suitable SRE practices such as service-level indicators and objectives, availability tracking, capacity planning, incident reviews, operational toil reduction, and reliability improvement."
      },
      {
        title: "Deployment Strategies and Rollback Planning",
        description:
          "Design deployment and recovery procedures using suitable rolling, blue-green, or canary strategies where supported by the application and platform, with validation steps and documented rollback criteria."
      },
      {
        title: "Cloud Cost and Resource Optimization",
        description:
          "Review infrastructure utilization, environment lifecycles, resource sizing, build consumption, storage retention, and deployment architecture to identify opportunities for cost control without compromising required reliability."
      },
      {
        title: "Backup, Recovery, and Resilience",
        description:
          "Plan backup and restoration procedures, document recovery objectives, identify service dependencies, and validate recovery processes appropriate to the system's availability and business-continuity requirements."
      },
      {
        title: "Linux and Server Operations Automation",
        description:
          "Automate repeatable Linux administration tasks, service configuration, deployment preparation, patching procedures, log management, access controls, and operational checks."
      },
      {
        title: "DevOps Documentation and Team Enablement",
        description:
          "Produce architecture notes, pipeline documentation, infrastructure instructions, runbooks, troubleshooting procedures, and practical knowledge-transfer sessions for internal technical teams."
      },
      {
        title: "DevOps Training and Mentorship",
        description:
          "Provide practical, project-oriented learning in Git, CI/CD, Terraform, Ansible, Docker, Kubernetes, cloud deployment, monitoring, and DevSecOps, adapted to the learners' experience and objectives."
      }
    ],

    process: [
      {
        title: "Discovery and Current-State Assessment",
        description:
          "Review the application architecture, repositories, cloud resources, deployment process, operational responsibilities, security requirements, and existing pain points. Agree on the scope and measurable objectives before implementation."
      },
      {
        title: "Architecture and Implementation Planning",
        description:
          "Select appropriate tools and design the pipeline, infrastructure, environments, security controls, monitoring, and release process. Document dependencies, access requirements, risks, acceptance criteria, and rollback considerations."
      },
      {
        title: "Build and Automate",
        description:
          "Implement the agreed pipeline, infrastructure code, configuration automation, container workflows, and supporting integrations. Use version control and reviewable changes so that the implementation remains understandable and maintainable."
      },
      {
        title: "Validate Security and Reliability",
        description:
          "Test build and deployment workflows, verify configuration and access controls, inspect logs and health checks, validate failure handling, and confirm that recovery procedures meet the agreed acceptance criteria."
      },
      {
        title: "Deploy and Handover",
        description:
          "Release through the agreed change process, monitor the resulting environment, provide documentation and runbooks, and transfer operational knowledge to the responsible team."
      },
      {
        title: "Measure and Improve",
        description:
          "Review agreed indicators such as deployment duration, change failure rate, recovery time, automation coverage, service availability, and infrastructure cost where relevant. Use the results to prioritize the next improvements."
      }
    ],

    idealFor: [
      "Organizations seeking to automate manual build, test, and deployment activities",
      "Software teams that need more consistent and traceable releases",
      "Businesses adopting cloud infrastructure or modernizing existing deployments",
      "Teams implementing Terraform, OpenTofu, Ansible, or other Infrastructure-as-Code practices",
      "Organizations containerizing applications with Docker or adopting Kubernetes",
      "Teams seeking GitOps workflows and controlled continuous delivery",
      "Businesses integrating security checks into CI/CD and infrastructure workflows",
      "Organizations experiencing recurring deployment failures or limited operational visibility",
      "Teams improving service reliability, incident response, backup, and recovery practices",
      "Startups and growing businesses establishing maintainable DevOps foundations",
      "IT professionals and teams seeking hands-on DevOps training and mentoring"
    ],

    ctaHeading: "Ready to make your software delivery more reliable?",

    subServices: [
      { name: "DevOps Strategy and Maturity Assessment" },
      { name: "CI/CD Pipeline Design and Implementation" },
      { name: "Git Workflow and Release Engineering" },
      { name: "Infrastructure as Code (Terraform and OpenTofu)" },
      { name: "Configuration Management with Ansible" },
      { name: "Docker Containerization" },
      { name: "Kubernetes and Container Orchestration" },
      { name: "GitOps and Continuous Delivery with Argo CD" },
      { name: "AWS, Azure, and GCP DevOps" },
      { name: "DevSecOps and Pipeline Security" },
      { name: "Secrets and Configuration Management" },
      { name: "Monitoring, Logging, and Observability" },
      { name: "Site Reliability Engineering (SRE)" },
      { name: "Deployment Strategies and Rollback Planning" },
      { name: "Cloud Cost Optimization" },
      { name: "Backup, Recovery, and Resilience Planning" },
      { name: "Linux and Server Operations Automation" },
      { name: "DevOps Documentation and Team Enablement" },
      { name: "DevOps Training and Mentorship" }
    ],

    cta: {
      label: "Book a Consultation",
      href: "/company/contact"
    }
  },

    {
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
    process: [
      { title: "Discovery & Assessment", description: "We assess your current security posture, assets, and risk areas to understand what matters most to protect." },
      { title: "Design & Proposal", description: "A scoped plan covering methodology, standards referenced, and deliverables, with cost agreed upfront." },
      { title: "Implementation & Configuration", description: "Assessment, hardening, or monitoring setup carried out hands-on, with findings documented as we go." },
      { title: "Testing, Documentation & Handover", description: "A findings report with severity ratings, remediation guidance, and an executive summary for leadership." },
    ],
    idealFor: [
      "Businesses needing a VAPT or security assessment",
      "Companies preparing for ISO 27001 or similar compliance",
      "Organizations without a formal incident response plan",
      "Teams needing SIEM or centralized log management set up",
      "Businesses wanting ongoing security monitoring rather than a one-time check",
    ],
    ctaHeading: "Ready to request a security assessment?",
    cta: { label: "Request a Security Assessment", href: "/services/vapt-security-assessments" },
  },
    {
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
    process: [
      { title: "Discovery & Assessment", description: "We assess your building, existing infrastructure, device counts, and connectivity needs before recommending anything." },
      { title: "Design & Proposal", description: "A clear network design covering topology, equipment, cabling scope, and cost." },
      { title: "Implementation & Configuration", description: "Cabling, equipment mounting, and configuration, carried out with minimal disruption to your working day." },
      { title: "Testing, Documentation & Handover", description: "Every link tested, everything labelled and documented, and a walkthrough for your team." },
    ],
    idealFor: [
      "Businesses setting up or relocating an office network",
      "Companies needing reliable WAN connectivity between multiple sites",
      "Organizations with WiFi coverage or performance issues",
      "Businesses needing structured cabling, rack work, or fiber installation",
      "Teams wanting ongoing network support rather than ad-hoc fixes",
    ],
    ctaHeading: "Ready to plan your network infrastructure?",
    cta: { label: "Book a Consultation", href: "/company/contact" },
  },
    {
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
    process: [
      { title: "Discovery & Assessment", description: "We review your current servers, applications, and requirements to understand what the environment needs to do." },
      { title: "Design & Proposal", description: "A clear plan covering distribution choice, server sizing, hosting architecture, and cost." },
      { title: "Implementation & Configuration", description: "Server builds, hardening, hosting, and database setup carried out carefully, with minimal disruption." },
      { title: "Testing, Documentation & Handover", description: "Performance and security verified, documentation handed over, and your team walked through day-to-day administration." },
    ],
    idealFor: [
      "Businesses needing a production Linux server set up correctly from the start",
      "Companies hosting websites or applications that need reliable uptime",
      "Teams needing database administration and real backup discipline",
      "Organizations wanting server hardening and security auditing",
      "Teams needing hands-on Linux administration training",
    ],
    ctaHeading: "Ready to plan your Linux server setup?",
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

  
  {
    slug: "software-apps-development",
    name: "Software & Apps Development",
    shortName: "Software Development",
    eyebrow: "Software Engineering & Digital Solutions",
    tagline:
      "Purpose-built software and applications that solve business problems, improve workflows, and support digital growth.",
    description:
      "StackPrime Consulting Ltd designs, develops, tests, deploys, and supports custom software, responsive web applications, mobile applications, APIs, and business automation solutions.",
    image: "/images/software-app-development.jpeg",
    imageAlt: "Software and application development",
    overview: [
      "StackPrime Consulting Ltd helps businesses turn ideas, operational challenges, and customer needs into practical software solutions. We work from requirements discovery and solution design through development, testing, deployment, documentation, and ongoing improvement. Each engagement is scoped around the intended users, business objectives, budget, security requirements, and expected growth.",
      "Our software engineering services cover custom business applications, responsive web platforms, mobile application development, backend systems, database design, API development, and integrations with third-party services. We aim to deliver intuitive user experiences supported by maintainable code, reliable data handling, and architectures suited to the application’s real requirements.",
      "Security, scalability, performance, and maintainability are considered throughout the development lifecycle. Depending on project needs, we can incorporate version control, automated testing, CI/CD pipelines, containerization, cloud hosting, monitoring, backups, and documented deployment procedures. The result is a solution your organization can operate, maintain, and evolve with confidence.",
    ],
    subServices: [
      { name: "Custom Software Development" },
      { name: "Business Process and Workflow Applications" },
      { name: "Web Application Design and Development" },
      { name: "Responsive Website and Web Portal Development" },
      { name: "Mobile Application Development" },
      { name: "Frontend Development and User Interfaces" },
      { name: "Backend Development and Business Logic" },
      { name: "REST API Design and Development" },
      { name: "Third-Party API and Platform Integration" },
      { name: "Database Design and Optimization" },
      { name: "UI/UX Design and Prototyping" },
      { name: "Software Testing and Quality Assurance" },
      { name: "Application Security Reviews" },
      { name: "Performance and Reliability Optimization" },
      { name: "Cloud Application Deployment and Hosting" },
      { name: "CI/CD and Release Automation" },
      { name: "Application Maintenance and Enhancements" },
      { name: "Technical Documentation and Handover" },
    ],
    features: [
      {
        title: "Custom Software Solutions",
        description:
          "Build applications around your business processes, reporting needs, operational workflows, and customer requirements rather than forcing your organization into an unsuitable off-the-shelf system.",
      },
      {
        title: "Web Application Development",
        description:
          "Develop responsive web applications, customer portals, dashboards, internal business tools, and online platforms designed for usability across desktop, tablet, and mobile devices.",
      },
      {
        title: "Mobile Application Development",
        description:
          "Plan and develop mobile application experiences around your target users, required device capabilities, backend services, and distribution requirements.",
      },
      {
        title: "Frontend and User Experience",
        description:
          "Create clear interfaces, responsive layouts, accessible interactions, and consistent user journeys aligned with your brand and application goals.",
      },
      {
        title: "Backend, APIs, and Integrations",
        description:
          "Implement application logic, authentication flows, APIs, data processing, and integrations with suitable third-party platforms and business systems.",
      },
      {
        title: "Database Design and Management",
        description:
          "Structure application data with appropriate schemas, validation, access controls, backup strategies, and performance considerations.",
      },
      {
        title: "Testing and Quality Assurance",
        description:
          "Use appropriate functional, integration, regression, and performance testing to identify defects and improve release confidence.",
      },
      {
        title: "Application Security",
        description:
          "Apply secure development practices, input validation, access control, secret management, dependency hygiene, and security testing appropriate to the application.",
      },
      {
        title: "Cloud Deployment and DevOps",
        description:
          "Deploy applications using suitable hosting and cloud infrastructure, with automated build and release workflows where appropriate.",
      },
      {
        title: "Maintenance and Continuous Improvement",
        description:
          "Support bug fixes, compatibility updates, performance improvements, documentation, and feature enhancements as business needs evolve.",
      },
    ],
    process: [
      {
        title: "Discovery and Requirements",
        description:
          "Understand the business problem, intended users, essential features, constraints, integrations, budget, and measurable outcomes.",
      },
      {
        title: "Solution Architecture and Planning",
        description:
          "Define the application scope, technology approach, data model, interfaces, milestones, delivery risks, and deployment requirements.",
      },
      {
        title: "UI/UX Design and Prototyping",
        description:
          "Map user journeys and develop interface concepts or prototypes so stakeholders can review the proposed experience before implementation.",
      },
      {
        title: "Development and Integration",
        description:
          "Implement frontend interfaces, backend services, databases, APIs, and required integrations using version-controlled development practices.",
      },
      {
        title: "Testing and Security Validation",
        description:
          "Validate requirements, investigate defects, test critical user journeys, and review security and performance considerations before release.",
      },
      {
        title: "Deployment and Launch",
        description:
          "Prepare the production environment, configure application settings, deploy the release, and verify the essential application functions.",
      },
      {
        title: "Documentation and Handover",
        description:
          "Provide agreed technical documentation, operating guidance, and knowledge transfer for the people responsible for the application.",
      },
      {
        title: "Support and Enhancement",
        description:
          "Agree on ongoing support, maintenance, monitoring, and future improvements based on the application's operational needs.",
      },
    ],
    idealFor: [
      "Startups validating a software product or digital business idea",
      "Small and medium-sized businesses replacing manual processes with software",
      "Organizations that need custom web applications or customer portals",
      "Businesses seeking mobile application development",
      "Teams integrating existing systems through APIs and automation",
      "Organizations modernizing legacy applications",
      "Companies that need cloud deployment and automated software delivery",
      "Businesses requiring ongoing application maintenance and technical support",
    ],
    ctaHeading:
      "Have a software idea or business process to improve?",
    cta: {
      label: "Discuss Your Project",
      href: "/company/contact",
    },
  },
];



export const serviceCatalog: Record<string, ServiceCatalogItem[]> = {
  "cloud-computing": [
    {
      title: "Multi-Cloud Strategy",
      description:
        "Practical AWS, Azure, and GCP architecture designed around your workloads, budget, and growth.",
      image: "/images/cloud-computing.jpg",
      imageAlt: "Cloud computing infrastructure",
    },
    {
      title: "Cloud Infrastructure & Migration",
      description:
        "Modernize infrastructure, migrate workloads, and build scalable cloud environments with less operational friction.",
      image: "/images/aws-coverpage.png",
      imageAlt: "Cloud infrastructure and architecture",
    },
    {
      title: "Cloud Security & Identity",
      description:
        "Protect cloud environments with strong identity, access control, monitoring, and security configuration.",
      image: "/images/cybersecurity-2.jpg",
      imageAlt: "Cloud security and identity management",
    },
    {
      title: "Automation & Infrastructure as Code",
      description:
        "Terraform, Ansible, and CI/CD automation for repeatable, auditable, and maintainable infrastructure.",
      image: "/images/devops-2.jpg",
      imageAlt: "DevOps automation and infrastructure as code",
    },
  ],

  "devops-engineering": [
    {
      title: "CI/CD Pipeline Engineering",
      description:
        "Automated build, test, security, and deployment pipelines that make software delivery predictable.",
      image: "/images/devops-1.jpg",
      imageAlt: "DevOps CI/CD pipeline engineering",
    },
    {
      title: "Infrastructure as Code",
      description:
        "Repeatable infrastructure provisioning with Terraform and configuration automation with Ansible.",
      image: "/images/devops-2.jpg",
      imageAlt: "Infrastructure as code and DevOps automation",
    },
    {
      title: "Containers & Cloud Deployment",
      description:
        "Containerized applications deployed across modern cloud and Kubernetes environments.",
      image: "/images/product-ui-1.jpg",
      imageAlt: "Cloud application deployment",
    },
    {
      title: "DevSecOps & Delivery Security",
      description:
        "Security integrated into development and delivery workflows without slowing engineering teams down.",
      image: "/images/cybersecurity-1.jpg",
      imageAlt: "DevSecOps security engineering",
    },
  ],

  cybersecurity: [
    {
      title: "Cybersecurity Assessment",
      description:
        "Identify vulnerabilities, configuration weaknesses, and security gaps across your environment.",
      image: "/images/vapt-2.jpg",
      imageAlt: "Cybersecurity vulnerability assessment",
    },
    {
      title: "Security Operations",
      description:
        "Improve visibility, monitoring, alerting, and response capabilities across infrastructure and systems.",
      image: "/images/cybersecurity-2.jpg",
      imageAlt: "Cybersecurity operations and monitoring",
    },
    {
      title: "Security Awareness & Training",
      description:
        "Practical cybersecurity training that helps teams understand threats and make safer technology decisions.",
      image: "/images/Cybersecurity-beginners.png",
      imageAlt: "Cybersecurity training",
    },
    {
      title: "Vulnerability & Risk Management",
      description:
        "Assess vulnerabilities and prioritize remediation based on business risk and exposure.",
      image: "/images/vapt-1.jpg",
      imageAlt: "Vulnerability assessment and penetration testing",
    },
  ],

  "networking-it-infrastructure": [
    {
      title: "Network Architecture",
      description:
        "Design reliable LAN, WAN, routing, switching, wireless, and enterprise network environments.",
      image: "/images/networking-1.jpg",
      imageAlt: "Network architecture and infrastructure",
    },
    {
      title: "Network Deployment",
      description:
        "Configure and deploy network infrastructure with structured addressing, routing, switching, and connectivity.",
      image: "/images/networking-2.jpg",
      imageAlt: "Network deployment and optimization",
    },
    {
      title: "Cisco & Network Administration",
      description:
        "Hands-on configuration, troubleshooting, administration, and optimization of network equipment.",
      image: "/images/cisco-cli.png",
      imageAlt: "Cisco network administration",
    },
    {
      title: "Infrastructure Connectivity",
      description:
        "Connect offices, branches, cloud environments, and remote users with secure and dependable infrastructure.",
      image: "/images/office-home-lan-wan.jpg",
      imageAlt: "Structured office LAN and WAN infrastructure",
    },
  ],

  "linux-server-administration": [
    {
      title: "Linux Server Deployment",
      description:
        "Deploy and configure secure Linux servers for applications, databases, web services, and infrastructure workloads.",
      image: "/images/linux-server-admin.jpg",
      imageAlt: "Linux server administration",
    },
    {
      title: "Server Hardening",
      description:
        "Apply practical security controls, access restrictions, system configuration, and operational best practices.",
      image: "/images/cybersecurity-2.jpg",
      imageAlt: "Linux server security hardening",
    },
    {
      title: "Network & Service Configuration",
      description:
        "Configure Linux networking, services, system access, DNS, web services, and infrastructure components.",
      image: "/images/networking-2.jpg",
      imageAlt: "Linux networking and service configuration",
    },
    {
      title: "Automation & Administration",
      description:
        "Automate repetitive server administration tasks and improve consistency across environments.",
      image: "/images/devops-2.jpg",
      imageAlt: "Linux infrastructure automation",
    },
  ],

  "intercom-voip-installation": [
    {
      title: "IP Intercom Systems",
      description:
        "Deploy modern IP-based intercom systems for homes, offices, facilities, and controlled access environments.",
      image: "/images/intercom-voip.jpg",
      imageAlt: "Intercom installation and configuration",
    },
    {
      title: "VoIP Communication",
      description:
        "Implement practical voice communication infrastructure for organizations that need reliable internal calling.",
      image: "/images/intercom-voip.jpg",
      imageAlt: "VoIP communication and IP intercom systems",
    },
    {
      title: "Office Communication Infrastructure",
      description:
        "Integrate communication systems into structured office networking and infrastructure environments.",
      image: "/images/network-deployment-optimization.jpg",
      imageAlt: "Office communication infrastructure",
    },
    {
      title: "Installation & Configuration",
      description:
        "Professional installation, configuration, testing, and handover of intercom and communication systems.",
      image: "/images/intercom-installation-configuration.jpg",
      imageAlt: "Intercom installation and configuration",
    },
  ],

  "office-home-lan-wan-installation": [
    {
      title: "LAN Installation",
      description:
        "Structured local-area networking for homes, offices, branches, and small business environments.",
      image: "/images/office-home-lan-wan.jpg",
      imageAlt: "Office and home LAN installation",
    },
    {
      title: "WAN & Site Connectivity",
      description:
        "Connect offices and locations with dependable network infrastructure designed around operational needs.",
      image: "/images/networking-1.jpg",
      imageAlt: "WAN and site connectivity",
    },
    {
      title: "Structured Office Infrastructure",
      description:
        "Plan and deploy practical cabling, network equipment, wireless connectivity, and infrastructure.",
      image: "/images/structured-office-infrastructure.jpg",
      imageAlt: "Structured office network infrastructure",
    },
    {
      title: "Network Deployment & Optimization",
      description:
        "Install, configure, troubleshoot, and optimize existing home and office networks.",
      image: "/images/network-deployment-optimization.jpg",
      imageAlt: "Office network deployment",
    },
  ],

  "cctv-camera-installation": [
    {
      title: "CCTV Camera Installation",
      description:
        "Professional camera deployment designed around the areas, assets, and risks that matter most.",
      image: "/images/cctv-installation.jpg",
      imageAlt: "CCTV camera installation",
    },
    {
      title: "Security Coverage Planning",
      description:
        "Plan camera positioning and coverage to reduce blind spots and improve visibility across your property.",
      image: "/images/structured-office-infrastructure.jpg",
      imageAlt: "Security coverage planning",
    },
    {
      title: "Networked Surveillance",
      description:
        "Integrate surveillance systems with network infrastructure for dependable access and monitoring.",
      image: "/images/networking-2.jpg",
      imageAlt: "Networked surveillance infrastructure",
    },
    {
      title: "Monitoring Infrastructure",
      description:
        "Configure practical monitoring and recording infrastructure for homes, offices, and commercial facilities.",
      image: "/images/intercom-installation-configuration.jpg",
      imageAlt: "Security monitoring infrastructure",
    },
  ],
  
  "software-apps-development": [
    {
      title: "Custom Software Solutions",
      description:
        "Business applications and digital tools designed around your workflows, operational requirements, and growth plans.",
      image: "/images/software-app-development.jpeg",
      imageAlt: "Software application development",
    },
    {
      title: "Mobile Application Development",
      description:
        "Mobile app experiences designed around your users, essential features, and business objectives.",
      image: "/images/software-mobile-apps.jpeg",
      imageAlt: "Mobile applications displayed on a smartphone",
    },
    {
      title: "Web Applications & Digital Platforms",
      description:
        "Responsive interfaces and web-based platforms that help customers and teams access services and information.",
      image: "/images/software-app-development.jpeg",
      imageAlt: "Application interface and software development",
    },
    {
      title: "APIs, Integration & Automation",
      description:
        "Connect application services and business systems to streamline data exchange and reduce repetitive work.",
      image: "/images/software-mobile-apps.jpeg",
      imageAlt: "Mobile application ecosystem",
    },
  ],
};


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
