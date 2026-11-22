// country hint for the consent banner. cloudflare sets cf-ipcountry at
// the edge and strips any client copy. no header means ask for consent.
export const dynamic = "force-dynamic";

export function GET(request: Request) {
	const country = request.headers.get("cf-ipcountry")?.toUpperCase() ?? null;
	return Response.json(
		{ country },
		{ headers: { "cache-control": "no-store" } },
	);
}
