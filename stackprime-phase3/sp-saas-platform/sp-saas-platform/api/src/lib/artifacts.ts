import { createHmac, timingSafeEqual } from 'node:crypto';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config.js';
import { httpError } from './errors.js';

// A download link is valid for five minutes. With the local store, the link is a signed token handled by
// our API (which then hands the file to nginx); with Spaces it is a signed link straight to the bucket.
export const DOWNLOAD_TTL_SECONDS = 300;

const signingKey = () => createHmac('sha256', config.JWT_SECRET).update('sp-download-v1').digest();
const mac = (body: string) => createHmac('sha256', signingKey()).update(body).digest('base64url');

export function signDownloadToken(artifactId: string, expiresAtMs: number): string {
  const body = Buffer.from(JSON.stringify({ a: artifactId, e: expiresAtMs })).toString('base64url');
  return `${body}.${mac(body)}`;
}

export function verifyDownloadToken(token: string, now = Date.now()): { artifactId: string } | null {
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = Buffer.from(mac(body));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const { a, e } = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as { a?: unknown; e?: unknown };
    if (typeof a !== 'string' || typeof e !== 'number' || e < now) return null;
    return { artifactId: a };
  } catch {
    return null;
  }
}

let s3: S3Client | undefined;
function spaces(): S3Client {
  const { SPACES_ENDPOINT, SPACES_REGION, SPACES_KEY, SPACES_SECRET } = config;
  if (!SPACES_ENDPOINT || !SPACES_REGION || !SPACES_KEY || !SPACES_SECRET || !config.SPACES_BUCKET) {
    throw httpError(503, 'STORAGE_NOT_CONFIGURED', 'Downloads are not set up yet.');
  }
  s3 ??= new S3Client({ region: SPACES_REGION, endpoint: SPACES_ENDPOINT, credentials: { accessKeyId: SPACES_KEY, secretAccessKey: SPACES_SECRET } });
  return s3;
}

/** The address the customer (or an agent) downloads from. Call only after checking entitlement. */
export async function createDownloadUrl(a: { id: string; storageKey: string; filename: string }): Promise<string> {
  if (config.ARTIFACT_STORE === 'spaces') {
    return getSignedUrl(
      spaces(),
      new GetObjectCommand({ Bucket: config.SPACES_BUCKET!, Key: a.storageKey, ResponseContentDisposition: `attachment; filename="${a.filename}"` }),
      { expiresIn: DOWNLOAD_TTL_SECONDS },
    );
  }
  const token = signDownloadToken(a.id, Date.now() + DOWNLOAD_TTL_SECONDS * 1000);
  return `${config.API_PUBLIC_URL}/v1/downloads/file/${token}`;
}
