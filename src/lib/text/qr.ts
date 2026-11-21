// qr payload builders, one per content type. throws plain errors the ui
// shows as is. capacity guard matches the honest 3KB story in the faq.
export type QrKind =
	| "text"
	| "url"
	| "wifi"
	| "vcard"
	| "email"
	| "sms"
	| "phone"
	| "geo";

export const QR_MAX_BYTES = 2900;

export function qrByteLength(content: string): number {
	return new TextEncoder().encode(content).length;
}

function escapeWifi(value: string): string {
	return value.replace(/([\\;,":])/g, "\\$1");
}

function escapeVcard(value: string): string {
	return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,");
}

export function buildQrContent(
	kind: QrKind,
	fields: Record<string, string>,
): string {
	const get = (name: string): string => (fields[name] ?? "").trim();
	let content: string;
	switch (kind) {
		case "text":
		case "url": {
			content = get("text");
			break;
		}
		case "wifi": {
			const auth = get("encryption") || "WPA";
			content = `WIFI:T:${auth};S:${escapeWifi(get("ssid"))};P:${escapeWifi(get("password"))};H:${get("hidden") === "1" ? "true" : "false"};;`;
			break;
		}
		case "vcard": {
			const lines = [
				"BEGIN:VCARD",
				"VERSION:3.0",
				`N:${escapeVcard(get("last"))};${escapeVcard(get("first"))};;;`,
				`FN:${escapeVcard(`${get("first")} ${get("last")}`.trim())}`,
			];
			if (get("org")) lines.push(`ORG:${escapeVcard(get("org"))}`);
			if (get("phone"))
				lines.push(`TEL;TYPE=CELL:${escapeVcard(get("phone"))}`);
			if (get("email")) lines.push(`EMAIL:${escapeVcard(get("email"))}`);
			if (get("url")) lines.push(`URL:${escapeVcard(get("url"))}`);
			lines.push("END:VCARD");
			content = lines.join("\n");
			break;
		}
		case "email": {
			const params = new URLSearchParams();
			if (get("subject")) params.set("subject", get("subject"));
			if (get("body")) params.set("body", get("body"));
			const query = params.toString();
			content = `mailto:${get("to")}${query ? `?${query}` : ""}`;
			break;
		}
		case "sms": {
			const query = get("body")
				? `?body=${encodeURIComponent(get("body"))}`
				: "";
			content = `sms:${get("number")}${query}`;
			break;
		}
		case "phone": {
			content = `tel:${get("number").replace(/\s+/g, "")}`;
			break;
		}
		case "geo": {
			const latitude = Number(get("latitude"));
			const longitude = Number(get("longitude"));
			if (
				!Number.isFinite(latitude) ||
				!Number.isFinite(longitude) ||
				Math.abs(latitude) > 90 ||
				Math.abs(longitude) > 180
			) {
				throw new Error("invalid coordinates");
			}
			content = `geo:${latitude},${longitude}`;
			break;
		}
	}
	if (!content) {
		throw new Error("empty content");
	}
	if (qrByteLength(content) > QR_MAX_BYTES) {
		throw new Error("content too long for a qr code");
	}
	return content;
}
