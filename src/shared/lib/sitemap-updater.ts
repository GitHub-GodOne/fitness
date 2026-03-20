import { readFile, writeFile } from "fs/promises";
import { join } from "path";

import { envConfigs } from "@/config";

const SITEMAP_PATH = join(process.cwd(), "public", "sitemap.xml");

function normalizePath(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}

function buildSitemapUrls(path: string) {
  const normalizedPath = normalizePath(path);
  const baseUrl =
    envConfigs.NEXT_PUBLIC_APP_URL ||
    envConfigs.app_url ||
    "https://fearnotforiamwithyou.com";

  try {
    const url = new URL(baseUrl);
    const urls = [`${url.origin}${normalizedPath}`];
    const hostname = url.hostname.toLowerCase();
    const isLocalhost =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1";
    const isIpAddress = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname);

    if (!isLocalhost && !isIpAddress) {
      const alternateUrl = new URL(baseUrl);
      alternateUrl.hostname = hostname.startsWith("www.")
        ? hostname.slice(4)
        : `www.${hostname}`;
      urls.push(`${alternateUrl.origin}${normalizedPath}`);
    }

    return Array.from(new Set(urls));
  } catch {
    return [`${baseUrl}${normalizedPath}`];
  }
}

function hasSitemapUrl(content: string, url: string) {
  return content.includes(`<loc>${url}</loc>`);
}

export async function addUrlToSitemap(path: string, priority = "1.00") {
  try {
    const urls = buildSitemapUrls(path);

    const content = await readFile(SITEMAP_PATH, "utf-8");
    const lastmod = new Date().toISOString();
    const missingUrls = urls.filter((url) => !hasSitemapUrl(content, url));

    if (missingUrls.length === 0) {
      return true;
    }

    const newUrls = missingUrls
      .map(
        (url) => `  <url>
    <loc>${url}</loc>
    <lastmod>${lastmod}</lastmod>
    <priority>${priority}</priority>
  </url>`
      )
      .join("\n");

    const updatedContent = content.replace(
      "</urlset>",
      `${newUrls}\n</urlset>`
    );
    await writeFile(SITEMAP_PATH, updatedContent, "utf-8");
    return true;
  } catch (error) {
    console.error("Failed to update sitemap:", error);
    return false;
  }
}

export async function removeUrlFromSitemap(path: string) {
  try {
    const urls = buildSitemapUrls(path);
    const content = await readFile(SITEMAP_PATH, "utf-8");

    let updatedContent = content;
    urls.forEach((url) => {
      const escapedUrl = url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      updatedContent = updatedContent.replace(
        new RegExp(
          `\\s*<url>\\s*<loc>${escapedUrl}<\\/loc>[\\s\\S]*?<\\/url>\\s*`,
          "g"
        ),
        "\n"
      );
    });

    if (updatedContent !== content) {
      await writeFile(SITEMAP_PATH, updatedContent, "utf-8");
    }

    return true;
  } catch (error) {
    console.error("Failed to remove sitemap URL:", error);
    return false;
  }
}
