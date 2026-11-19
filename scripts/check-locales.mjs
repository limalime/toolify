import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// every locale must carry exactly the key set of english. anything less
// renders a visible key path instead of a sentence, anything more is dead.
// arrays also pin their length, so no locale silently drops a section.
export function flattenKeys(value, prefix = "") {
	const keys = new Set();
	if (Array.isArray(value)) {
		keys.add(`${prefix}.length:${value.length}`);
		return keys;
	}
	if (value && typeof value === "object") {
		for (const [name, child] of Object.entries(value)) {
			const path = prefix ? `${prefix}.${name}` : name;
			if (child && typeof child === "object") {
				for (const key of flattenKeys(child, path)) {
					keys.add(key);
				}
			} else {
				keys.add(path);
			}
		}
	}
	return keys;
}

export function checkKeySets(bundles) {
	const problems = [];
	const reference = flattenKeys(bundles.en ?? {});
	for (const [locale, bundle] of Object.entries(bundles)) {
		if (locale === "en") {
			continue;
		}
		const keys = flattenKeys(bundle ?? {});
		for (const key of reference) {
			if (!keys.has(key)) {
				problems.push(`${locale}: missing ${key}`);
			}
		}
		for (const key of keys) {
			if (!reference.has(key)) {
				problems.push(`${locale}: extra ${key}`);
			}
		}
	}
	return problems;
}

const invokedDirectly = process.argv[1] === fileURLToPath(import.meta.url);

if (invokedDirectly) {
	const root = join(dirname(fileURLToPath(import.meta.url)), "..");
	const dir = join(root, "messages");
	const bundles = {};
	for (const file of readdirSync(dir)
		.filter((name) => name.endsWith(".json"))
		.sort()) {
		const locale = file.slice(0, -".json".length);
		bundles[locale] = JSON.parse(readFileSync(join(dir, file), "utf8"));
	}
	if (!bundles.en) {
		console.error("messages/en.json is missing, it defines the key set");
		process.exit(1);
	}
	const problems = checkKeySets(bundles);
	if (problems.length > 0) {
		console.error(`locale parity failed with ${problems.length} problems:`);
		for (const problem of problems) {
			console.error(`- ${problem}`);
		}
		process.exit(1);
	}
	console.log(
		`locale parity holds across ${Object.keys(bundles).length} locales`,
	);
}
