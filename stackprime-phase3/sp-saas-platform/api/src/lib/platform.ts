import type { Arch, Platform } from '@prisma/client';

// Phase 3 ships desktop and server packages only. ANDROID / IOS exist in the database enum for the
// Phase 4 mobile addendum, but no Phase 3 route accepts or returns them.
export const DESKTOP_PLATFORMS = ['windows', 'macos', 'linux-deb', 'linux-rpm', 'linux-tar', 'container'] as const;
export type PlatformSlug = (typeof DESKTOP_PLATFORMS)[number];

export const ARCHES = ['x64', 'arm64', 'universal'] as const;
export type ArchSlug = (typeof ARCHES)[number];

const TO_ENUM: Record<PlatformSlug, Platform> = {
  windows: 'WINDOWS',
  macos: 'MACOS',
  'linux-deb': 'LINUX_DEB',
  'linux-rpm': 'LINUX_RPM',
  'linux-tar': 'LINUX_TAR',
  container: 'CONTAINER',
};

export const platformFromSlug = (s: PlatformSlug): Platform => TO_ENUM[s];
export const platformToSlug = (p: Platform): string => p.toLowerCase().replace('_', '-');
export const archFromSlug = (a: ArchSlug): Arch => a.toUpperCase() as Arch;
export const archToSlug = (a: Arch): string => a.toLowerCase();
