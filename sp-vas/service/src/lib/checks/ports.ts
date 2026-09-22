import net from "node:net";

export type PortResult = { port: number; label: string; open: boolean };

// Deliberately a short, fixed list of well-known ports checked with a
// simple TCP connect — not a scan/sweep. This is the same category of
// check as "is this website up" — confirming whether a commonly-sensitive
// port is reachable from the public internet, not probing for exploits.
const WELL_KNOWN_PORTS: { port: number; label: string }[] = [
  { port: 21, label: "FTP" },
  { port: 22, label: "SSH" },
  { port: 23, label: "Telnet" },
  { port: 25, label: "SMTP" },
  { port: 3306, label: "MySQL" },
  { port: 3389, label: "RDP" },
  { port: 5432, label: "PostgreSQL" },
  { port: 6379, label: "Redis" },
];

function checkPort(host: string, port: number, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let done = false;
    const finish = (open: boolean) => {
      if (done) return;
      done = true;
      socket.destroy();
      resolve(open);
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
    socket.connect(port, host);
  });
}

export async function checkExposedPorts(host: string, timeoutMs = 2000): Promise<PortResult[]> {
  // Sequential, not parallel-flooded — keeps this from ever looking like a
  // burst scan against the target, and is gentle on the target's own
  // connection-rate defenses.
  const results: PortResult[] = [];
  for (const { port, label } of WELL_KNOWN_PORTS) {
    const open = await checkPort(host, port, timeoutMs);
    results.push({ port, label, open });
  }
  return results;
}
