/**
 * Single source of truth for this app's public identity.
 * Consumed by metadata, manifest, robots and sitemap.
 */
export const siteConfig = {
  name: "Abecca Demo",
  title: "Abecca Demo — Omni-Med Nexus",
  description: "Demo and training sandbox for the Omni-Med Nexus platform.",
  keywords: [
    "Abecca Demo",
    "Omni-Med Nexus",
    "demo",
    "training sandbox",
    "healthcare platform",
  ],
  /** Browser chrome + PWA colors. */
  themeColor: "#0a0a0a",
  backgroundColor: "#0a0a0a",
  /** Training sandbox — keep out of search engines. */
  indexable: false,
} as const;

/**
 * Public base URL used for canonical URLs, OpenGraph, robots and sitemap.
 * Priority: explicit NEXT_PUBLIC_SITE_URL → Vercel production URL → localhost.
 * Always returned without a trailing slash.
 */
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : undefined) ??
  "http://localhost:3000"
).replace(/\/+$/, "");
