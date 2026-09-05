import { describe, expect, it } from 'vitest';
import rawConfig from '../public/staticwebapp.config.json';

type Route = { route: string; headers?: Record<string, string>; rewrite?: string };

describe('static response policy', () => {
  const config = rawConfig as {
    routes: Route[];
    globalHeaders: Record<string, string>;
    mimeTypes: Record<string, string>;
    responseOverrides: Record<string, { rewrite: string }>;
  };

  it('caches hashed build assets immutably and keeps the worker fresh', () => {
    const immutableRoutes = ['/assets/index-*', '/assets/workbox-window*', '/workbox-*'];
    const worker = config.routes.find(({ route }) => route === '/sw.js');
    for (const route of immutableRoutes) {
      expect(config.routes.find((candidate) => candidate.route === route)?.headers?.['Cache-Control'])
        .toBe('public, max-age=31536000, immutable');
    }
    expect(worker?.headers?.['Cache-Control']).toBe('no-cache');
  });

  it('denies framing and restricts content sources', () => {
    expect(config.globalHeaders['X-Frame-Options']).toBe('DENY');
    expect(config.globalHeaders['Content-Security-Policy']).toContain("frame-ancestors 'none'");
    expect(config.globalHeaders['Content-Security-Policy']).toContain("default-src 'self'");
  });

  it('serves a designed 404 and the correct AVIF media type', () => {
    expect(config.responseOverrides['404']?.rewrite).toBe('/404.html');
    expect(config.mimeTypes['.avif']).toBe('image/avif');
  });

  it('rewrites only known app routes so unknown paths remain real 404s', () => {
    for (const route of ['/demo', '/privacy', '/terms']) {
      expect(config.routes.find((entry) => entry.route === route)?.rewrite).toBe('/index.html');
    }
    expect('navigationFallback' in config).toBe(false);
  });
});
