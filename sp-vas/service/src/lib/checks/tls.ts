import tls from "node:tls";

export type TlsResult = {
  ok: boolean;
  protocol?: string;
  issuer?: string;
  validTo?: string;
  daysUntilExpiry?: number;
  selfSigned?: boolean;
  error?: string;
};

// Passive: opens a standard TLS handshake, the same thing a browser does
// visiting the site. No certificate/cipher fuzzing, no downgrade attempts.
export function checkTls(hostname: string, timeoutMs = 5000): Promise<TlsResult> {
  return new Promise((resolve) => {
    const socket = tls.connect(
      { host: hostname, port: 443, servername: hostname, timeout: timeoutMs, rejectUnauthorized: false },
      () => {
        const cert = socket.getPeerCertificate();
        const protocol = socket.getProtocol() ?? undefined;
        const validTo = cert.valid_to ? new Date(cert.valid_to) : undefined;
        const daysUntilExpiry = validTo
          ? Math.round((validTo.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : undefined;

        const firstOf = (v: string | string[] | undefined): string | undefined =>
          Array.isArray(v) ? v[0] : v;
        const issuerName = firstOf(cert.issuer?.O) ?? firstOf(cert.issuer?.CN);

        resolve({
          ok: true,
          protocol,
          issuer: issuerName,
          validTo: validTo?.toISOString(),
          daysUntilExpiry,
          selfSigned: cert.issuer?.CN === cert.subject?.CN,
        });
        socket.destroy();
      }
    );

    socket.on("error", (err) => {
      resolve({ ok: false, error: err.message });
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve({ ok: false, error: "TLS connection timed out" });
    });
  });
}
