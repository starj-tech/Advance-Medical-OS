import type { MetadataRoute } from "next";
import { siteConfig, siteUrl } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  if (!siteConfig.indexable) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
