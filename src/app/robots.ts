import { MetadataRoute } from "next";

import { envConfigs } from "@/config";

export default function robots(): MetadataRoute.Robots {
  const appUrl = envConfigs.app_url;
  let host: string | undefined;

  try {
    host = new URL(appUrl).host;
  } catch {
    host = undefined;
  }
  const blockedAiBots = [
    "Amazonbot",
    "Applebot-Extended",
    "Bytespider",
    "CCBot",
    "ClaudeBot",
    "GPTBot",
    "Google-Extended",
    "meta-externalagent",
  ];

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/", "/activity/", "/settings/"],
      },
      ...blockedAiBots.map((userAgent) => ({
        userAgent,
        disallow: "/",
      })),
    ],
    host,
    sitemap: [`${appUrl}/sitemap.xml`, `${appUrl}/video-sitemap.xml`],
  };
}
