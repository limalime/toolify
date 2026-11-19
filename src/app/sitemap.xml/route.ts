import { buildSitemapIndex } from "@/lib/sitemap";

// sitemap index over the seven per-locale sitemaps.
export async function GET() {
	return new Response(buildSitemapIndex(), {
		headers: { "Content-Type": "application/xml" },
	});
}
