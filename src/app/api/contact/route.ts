const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// contact inbox forwarder. delivery needs CONTACT_FORM_ACTION, a form
// service endpoint provided outside the repo. without it the route
// answers honestly instead of faking a delivery.
export async function POST(request: Request) {
	let payload: unknown;
	try {
		payload = await request.json();
	} catch {
		return Response.json({ ok: false, error: "invalid" }, { status: 422 });
	}
	const fields = payload as Record<string, unknown>;
	const name = typeof fields.name === "string" ? fields.name.trim() : "";
	const email = typeof fields.email === "string" ? fields.email.trim() : "";
	const message =
		typeof fields.message === "string" ? fields.message.trim() : "";
	if (!name || !email || !message || !EMAIL_PATTERN.test(email)) {
		return Response.json({ ok: false, error: "invalid" }, { status: 422 });
	}

	const action = process.env.CONTACT_FORM_ACTION;
	if (!action) {
		return Response.json({ ok: false, error: "unavailable" }, { status: 503 });
	}

	try {
		const upstream = await fetch(action, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name, email, message }),
		});
		if (!upstream.ok) {
			return Response.json({ ok: false, error: "upstream" }, { status: 502 });
		}
		return Response.json({ ok: true });
	} catch {
		return Response.json({ ok: false, error: "upstream" }, { status: 502 });
	}
}
