/**
 * Single source of truth for this app's public identity.
 * Consumed by metadata, manifest, robots and sitemap.
 */
export const siteConfig = {
  name: "Abecca IT",
  title: "Abecca IT — Omni-Med Nexus",
  description: "IT operations console for the Omni-Med Nexus platform.",
  keywords: [
    "Abecca IT",
    "Omni-Med Nexus",
    "IT operations",
    "healthcare platform",
    "medical software",
  ],
  /** Browser chrome + PWA colors. */
  themeColor: "#0a0a0a",
  backgroundColor: "#0a0a0a",
  /** Internal IT operations console — keep out of search engines. */
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
