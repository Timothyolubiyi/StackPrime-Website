// Central content model for site structure, so the mega-menu, footer, and
// service pages all read from one place rather than duplicating copy.

export type SubService = {
  name: string;
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
