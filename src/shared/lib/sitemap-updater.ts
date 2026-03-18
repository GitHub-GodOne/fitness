import { readFile, writeFile } from "fs/promises";
import { join } from "path";

import { envConfigs } from "@/config";

const SITEMAP_PATH = join(process.cwd(), "public", "sitemap.xml");

export async function addUrlToSitemap(path: string, priority = "1.00") {
  try {
    const baseUrl =
      envConfigs.NEXT_PUBLIC_APP_URL || "https://fearnotforiamwithyou.com";
    const fullUrl = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

    const content = await readFile(SITEMAP_PATH, "utf-8");
    const lastmod = new Date().toISOString();

    const newUrl = `  <url>
    <loc>${fullUrl}</loc>
    <lastmod>${lastmod}</lastmod>
    <priority>${priority}</priority>
  </url>`;

    const updatedContent = content.replace("</urlset>", `${newUrl}\n</urlset>`);
    await writeFile(SITEMAP_PATH, updatedContent, "utf-8");
    return true;
  } catch (error) {
    console.error("Failed to update sitemap:", error);
    return false;
  }
}
