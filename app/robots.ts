import type { MetadataRoute } from "next";
import { SITE_URL } from "@shared/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/projects/"] }, // 작업실은 개인 화면
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
