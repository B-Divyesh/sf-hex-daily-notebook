import { describe, expect, it } from 'vitest';
import rawConfig from '../public/staticwebapp.config.json';

type Route = { route: string; headers?: Record<string, string> };

describe('static response policy', () => {
  const config = rawConfig as {
    routes: Route[];
    globalHeaders: Record<string, string>;
  };

  it('caches hashed build assets immutably and keeps the worker fresh', () => {
    const assets = config.routes.find(({ route }) => route === '/assets/index-*');
    const worker = config.routes.find(({ route }) => route === '/sw.js');
    expect(assets?.headers?.['Cache-Control']).toBe('public, max-age=31536000, immutable');
    expect(worker?.headers?.['Cache-Control']).toBe('no-cache');
  });

  it('denies framing and restricts content sources', () => {
    expect(config.globalHeaders['X-Frame-Options']).toBe('DENY');
    expect(config.globalHeaders['Content-Security-Policy']).toContain("frame-ancestors 'none'");
    expect(config.globalHeaders['Content-Security-Policy']).toContain("default-src 'self'");
  });
});
