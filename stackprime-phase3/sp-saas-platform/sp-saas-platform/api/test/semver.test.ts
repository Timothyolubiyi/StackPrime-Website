import { describe, expect, it } from 'vitest';
import { compareSemver, newest, parseSemver } from '../src/lib/semver.js';

describe('semver', () => {
  it('orders numbers numerically, not alphabetically', () => {
    expect(compareSemver('1.10.0', '1.9.0')).toBeGreaterThan(0);
    expect(compareSemver('2.0.0', '10.0.0')).toBeLessThan(0);
    expect(compareSemver('1.2.3', '1.2.3')).toBe(0);
  });
  it('puts a release after its own pre-releases, and orders pre-releases properly', () => {
    expect(compareSemver('1.4.0-rc.1', '1.4.0')).toBeLessThan(0);
    expect(compareSemver('1.4.0-rc.2', '1.4.0-rc.10')).toBeLessThan(0);
    expect(compareSemver('1.4.0-alpha', '1.4.0-1')).toBeGreaterThan(0); // text identifiers sort after numeric ones
    expect(compareSemver('1.4.0-rc', '1.4.0-rc.1')).toBeLessThan(0);
  });
  it('finds the newest, and handles empty or invalid input', () => {
    expect(newest(['1.0.0', '1.10.0', '1.2.0', '1.10.0-rc.1'])).toBe('1.10.0');
    expect(newest([])).toBeNull();
    expect(parseSemver('1.2')).toBeNull();
    expect(compareSemver('nonsense', '1.0.0')).toBeLessThan(0);
  });
});
