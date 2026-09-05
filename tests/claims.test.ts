import { describe, expect, it } from 'vitest';
import claimsFile from '../.factory/claims.json';

type Claim = { id: string; claim: string; where: string; test: string; sandbox: string };

describe('public claim registry', () => {
  const claims = claimsFile as Claim[];

  it('gives every declared claim one browser outcome test', () => {
    expect(claims.length).toBeGreaterThan(0);
    expect(new Set(claims.map(({ id }) => id)).size).toBe(claims.length);
    for (const claim of claims) {
      expect(claim.claim.length).toBeGreaterThan(0);
      expect(claim.where.length).toBeGreaterThan(0);
      expect(claim.sandbox.length).toBeGreaterThan(0);
      expect(claim.test).toContain(`--grep @claim:${claim.id}`);
    }
  });
});
