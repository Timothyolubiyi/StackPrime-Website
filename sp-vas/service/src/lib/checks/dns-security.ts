import dns from "node:dns/promises";

export type DnsSecurityResult = {
  spf: { present: boolean; record?: string };
  dmarc: { present: boolean; record?: string; policy?: string };
  dkimHeuristic: { likelyConfigured: boolean; note: string };
};

// Passive: standard DNS TXT lookups — the same requests any mail server
// makes. DKIM can't be reliably checked without knowing the selector, so
// this is explicitly labeled a heuristic, not a definitive check.
export async function checkDnsSecurity(domain: string): Promise<DnsSecurityResult> {
  const result: DnsSecurityResult = {
    spf: { present: false },
    dmarc: { present: false },
    dkimHeuristic: { likelyConfigured: false, note: "DKIM requires a known selector — not checked directly." },
  };

  try {
    const txtRecords = await dns.resolveTxt(domain);
    const flat = txtRecords.map((r) => r.join(""));
    const spf = flat.find((r) => r.startsWith("v=spf1"));
    if (spf) result.spf = { present: true, record: spf };
  } catch {
    // no TXT records or lookup failed — leave as not present
  }

  try {
    const dmarcRecords = await dns.resolveTxt(`_dmarc.${domain}`);
    const flat = dmarcRecords.map((r) => r.join(""));
    const dmarc = flat.find((r) => r.startsWith("v=DMARC1"));
    if (dmarc) {
      const policyMatch = dmarc.match(/p=(\w+)/);
      result.dmarc = { present: true, record: dmarc, policy: policyMatch?.[1] };
    }
  } catch {
    // no DMARC record
  }

  return result;
}
