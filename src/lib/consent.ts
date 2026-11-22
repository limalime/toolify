// consent storage and the eea country gate. unknown countries are
// treated as needing consent so a missing header never grants tracking.
export type ConsentDecision = "granted" | "denied";

export const CONSENT_STORAGE_KEY = "toolify.consent.v1";
export const CONSENT_OPEN_EVENT = "toolify:consent-open";

// eu member states plus the wider eea, the uk, switzerland, and
// gibraltar. french overseas departments count under gdpr as well.
const CONSENT_COUNTRIES = new Set([
	"AT",
	"AX",
	"BE",
	"BG",
	"BL",
	"CH",
	"CY",
	"CZ",
	"DE",
	"DK",
	"EE",
	"ES",
	"FI",
	"FR",
	"GB",
	"GF",
	"GI",
	"GP",
	"GR",
	"HR",
	"HU",
	"IE",
	"IS",
	"IT",
	"LI",
	"LT",
	"LU",
	"LV",
	"MF",
	"MQ",
	"MT",
	"NL",
	"NO",
	"PL",
	"PM",
	"PT",
	"RE",
	"RO",
	"SE",
	"SI",
	"SK",
	"YT",
]);

function storageOrNull(): Storage | null {
	if (typeof window === "undefined") {
		return null;
	}
	try {
		return window.localStorage;
	} catch {
		return null;
	}
}

export function readConsent(storage: Storage | null = storageOrNull()) {
	if (!storage) {
		return null;
	}
	try {
		const value = storage.getItem(CONSENT_STORAGE_KEY);
		return value === "granted" || value === "denied" ? value : null;
	} catch {
		return null;
	}
}

export function writeConsent(
	decision: ConsentDecision,
	storage: Storage | null = storageOrNull(),
) {
	if (!storage) {
		return;
	}
	try {
		storage.setItem(CONSENT_STORAGE_KEY, decision);
	} catch {
		// safari private mode and blocked storage simply keep no choice
	}
}

export function clearConsent(storage: Storage | null = storageOrNull()) {
	if (!storage) {
		return;
	}
	try {
		storage.removeItem(CONSENT_STORAGE_KEY);
	} catch {
		// nothing to clear if storage refuses writes
	}
}

// eea, uk, and switzerland require a consent signal before analytics.
// blank input means we could not tell where the visitor is, so ask.
export function isEeaCountry(country: string | null | undefined): boolean {
	const code = country?.trim().toUpperCase();
	if (!code || code === "XX" || code === "T1") {
		return true;
	}
	return CONSENT_COUNTRIES.has(code);
}

// forget the stored choice and ask the banner to reopen. the provider
// stops recording until a new decision is made.
export function openConsentSettings() {
	clearConsent();
	if (typeof window !== "undefined") {
		window.dispatchEvent(new Event(CONSENT_OPEN_EVENT));
	}
}
