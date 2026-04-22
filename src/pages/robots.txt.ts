import type { APIContext } from "astro";

const fallbackSite = new URL("https://hddn.app");

export function GET({ site }: APIContext) {
  const resolvedSite = site ?? fallbackSite;
  const sitemapUrl = new URL(
    `${import.meta.env.BASE_URL}sitemap-index.xml`,
    resolvedSite,
  );

  return new Response(
    `User-agent: *\nAllow: /\n\nSitemap: ${sitemapUrl.href}\n`,
    {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    },
  );
}
