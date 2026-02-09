import { MetadataRoute } from "next";

import { envConfigs } from "@/config";

export default function robots(): MetadataRoute.Robots {
  const appUrl = envConfigs.app_url;

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/*?callbackUrl=*"],
    },
    sitemap: `${appUrl}/sitemap.xml`,
  };
}
