// uuid generation across versions. v2 is excluded everywhere by
// design, v7 is the recommended default.
import { v1, v3, v4, v5, v6, v7, validate } from "uuid";

export type UuidVersion = "v1" | "v3" | "v4" | "v5" | "v6" | "v7";

export const UUID_VERSIONS: UuidVersion[] = [
	"v1",
	"v3",
	"v4",
	"v5",
	"v6",
	"v7",
];

export interface UuidOptions {
	namespace?: string;
	name?: string;
}

export function generateUuid(
	version: UuidVersion,
	options: UuidOptions = {},
): string {
	switch (version) {
		case "v1":
			return v1();
		case "v3":
			return v3(options.name ?? "", options.namespace ?? "");
		case "v4":
			return v4();
		case "v5":
			return v5(options.name ?? "", options.namespace ?? "");
		case "v6":
			return v6();
		case "v7":
			return v7();
	}
}

export function isUuid(text: string): boolean {
	return validate(text);
}

export function uuidVersionOf(value: string): number | null {
	const match =
		/^[0-9a-f]{8}-[0-9a-f]{4}-([0-9a-f])[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.exec(
			value.trim(),
		);
	if (!match?.[1]) {
		return null;
	}
	return Number.parseInt(match[1], 16);
}
