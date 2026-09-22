import dns from "node:dns/promises";
import net from "node:net";
import psl from "psl";

export type ParsedTarget = { hostname: string; url: string } | { error: string };

const PRIVATE_RANGES: [string, number][] = [
  ["10.0.0.0", 8],
  ["172.16.0.0", 12],
  ["192.168.0.0", 16],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["0.0.0.0", 8],
];

function ipToLong(ip: string): number {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

function isPrivateIp(ip: string): boolean {
  if (!net.isIPv4(ip)) return true; // reject anything we can't confidently classify, including IPv6 for now
  const ipLong = ipToLong(ip);
  return PRIVATE_RANGES.some(([base, bits]) => {
    const baseLong = ipToLong(base);
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (ipLong & mask) === (baseLong & mask);
  });
}

// Guards against SP VAS being used as an SSRF vector — pointed at the
// droplet's own internal network, localhost, or link-local metadata
// endpoints (the classic cloud-metadata-theft pattern). Every target is
// resolved and checked before any check module touches it.
export async function parseAndValidateTarget(input: string): Promise<ParsedTarget> {
  let candidate = input.trim();
  if (!candidate) return { error: "No target provided." };

  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return { error: "Could not parse target as a URL or hostname." };
  }

  const hostname = url.hostname;

  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      return { error: "Private, loopback, and link-local addresses cannot be assessed." };
    }
    return { hostname, url: url.toString() };
  }

  // Hostname — must resolve to a public domain (basic sanity check via psl)
  // and must not resolve to a private IP (DNS rebinding guard).
  const parsed = psl.parse(hostname);
  if (parsed.error || !parsed.domain) {
    return { error: "Target does not appear to be a valid public domain." };
  }

  try {
    const addresses = await dns.resolve4(hostname);
    if (addresses.some(isPrivateIp)) {
      return { error: "Target resolves to a private address and cannot be assessed." };
    }
  } catch {
    return { error: "Could not resolve target hostname." };
  }

  return { hostname, url: url.toString() };
}
