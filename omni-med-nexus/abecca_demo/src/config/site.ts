/**
 * Single source of truth for this app's public identity.
 * Consumed by metadata, manifest, robots and sitemap.
 */
export const siteConfig = {
  name: "Abecca",
  title: "Abecca — Omni-Med Nexus",
  description: "Clinical portal for the Omni-Med Nexus platform.",
  keywords: [
    "Abecca",
    "Omni-Med Nexus",
    "clinical portal",
    "healthcare platform",
    "medical software",
  ],
  /** Browser chrome + PWA colors. */
  themeColor: "#000000",
  backgroundColor: "#000000",
  /** Whether search engines may index this app. */
  indexable: true,
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
