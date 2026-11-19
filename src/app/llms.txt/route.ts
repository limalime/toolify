import { buildLlmsTxt } from "@/lib/llms";

export async function GET() {
	return new Response(buildLlmsTxt(), {
		headers: { "Content-Type": "text/plain; charset=utf-8" },
	});
}
