// password generation on crypto randomness. strength is plain
// entropy math over the active character pool.
export interface PasswordSets {
	lower: boolean;
	upper: boolean;
	digits: boolean;
	symbols: boolean;
}

const LOWER = "abcdefghijklmnopqrstuvwxyz";
const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS = "0123456789";
const SYMBOLS = "!@#$%^&*()-_=+[]{};:,.<>?/~";
const AMBIGUOUS = new Set(["l", "1", "I", "O", "0", "o"]);

export function passwordPool(
	sets: PasswordSets,
	excludeAmbiguous: boolean,
): string {
	let pool = "";
	if (sets.lower) pool += LOWER;
	if (sets.upper) pool += UPPER;
	if (sets.digits) pool += DIGITS;
	if (sets.symbols) pool += SYMBOLS;
	if (excludeAmbiguous) {
		pool = [...pool].filter((char) => !AMBIGUOUS.has(char)).join("");
	}
	return pool;
}

export function passwordEntropyBits(length: number, poolSize: number): number {
	if (length <= 0 || poolSize <= 1) {
		return 0;
	}
	return Math.round(length * Math.log2(poolSize));
}

export type PasswordStrength = "weak" | "fair" | "strong" | "excellent";

export function passwordStrength(bits: number): PasswordStrength {
	if (bits < 50) return "weak";
	if (bits < 80) return "fair";
	if (bits < 110) return "strong";
	return "excellent";
}

export function generatePassword(length: number, pool: string): string {
	if (!pool) {
		throw new Error("empty pool");
	}
	// rejection sampling keeps the modulo from favouring low indexes
	const limit = 2 ** 32 - (2 ** 32 % pool.length);
	const chars: string[] = [];
	while (chars.length < length) {
		const bytes = new Uint32Array(length - chars.length);
		crypto.getRandomValues(bytes);
		for (const value of bytes) {
			if (value < limit) {
				chars.push(pool[value % pool.length] as string);
			}
			if (chars.length === length) {
				break;
			}
		}
	}
	return chars.join("");
}
