// bip39 mnemonics plus address derivation. purpose numbers follow the
// bips exactly: 44 legacy, 49 wrapped segwit, 84 native segwit, 86
// taproot. bip141 is a proposal, never a path, and appears nowhere.

import { ripemd160 } from "@noble/hashes/legacy.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { keccak_256 } from "@noble/hashes/sha3.js";
import { getPublicKey, Point } from "@noble/secp256k1";
import { base58check, bech32, bech32m } from "@scure/base";
import { HDKey } from "@scure/bip32";
import {
	generateMnemonic,
	mnemonicToSeedSync,
	validateMnemonic,
} from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";

export type WalletCoin = "BTC" | "ETH" | "LTC";
export type WalletPurpose = 44 | 49 | 84 | 86;

export const WALLET_COINS: WalletCoin[] = ["BTC", "ETH", "LTC"];
export const WALLET_PURPOSES: WalletPurpose[] = [44, 49, 84, 86];

const COIN_TYPE: Record<WalletCoin, number> = { BTC: 0, ETH: 60, LTC: 2 };

const P2PKH_VERSION: Record<WalletCoin, number> = {
	BTC: 0x00,
	ETH: 0x00,
	LTC: 0x30,
};
const P2SH_VERSION: Record<WalletCoin, number> = {
	BTC: 0x05,
	ETH: 0x05,
	LTC: 0x32,
};
const BECH32_HRP: Record<WalletCoin, string> = {
	BTC: "bc",
	ETH: "bc",
	LTC: "ltc",
};

export interface Derivation {
	coin: WalletCoin;
	purpose: WalletPurpose;
	account: number;
	change: number;
	index: number;
}

const base58 = base58check(sha256);

export function newMnemonic(words: 12 | 24): string {
	return generateMnemonic(wordlist, words === 12 ? 128 : 256);
}

export function checkMnemonic(mnemonic: string): boolean {
	return validateMnemonic(
		mnemonic.trim().toLowerCase().replace(/\s+/g, " "),
		wordlist,
	);
}

export function derivationPath(input: Derivation): string {
	const coin = COIN_TYPE[input.coin];
	const purpose = input.coin === "ETH" ? 44 : input.purpose;
	return `m/${purpose}'/${coin}'/${input.account}'/${input.change}/${input.index}`;
}

function hash160(data: Uint8Array): Uint8Array {
	return ripemd160(sha256(data));
}

function taprootOutput(compressed: Uint8Array, seckey: Uint8Array): Uint8Array {
	const tagHash = sha256(new TextEncoder().encode("TapTweak"));
	const tweakInput = new Uint8Array([
		...tagHash,
		...tagHash,
		...compressed.slice(1),
	]);
	const tweak = BigInt(
		`0x${[...sha256(tweakInput)].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`,
	);
	const order = Point.CURVE().n;
	let secret = BigInt(
		`0x${[...seckey].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`,
	);
	if ((compressed[0] as number) === 0x03) {
		secret = order - secret;
	}
	const tweaked = (secret + tweak) % order;
	const tweakedBytes = new Uint8Array(32);
	const hex = tweaked.toString(16).padStart(64, "0");
	for (let index = 0; index < 32; index++) {
		tweakedBytes[index] = Number.parseInt(
			hex.slice(index * 2, index * 2 + 2),
			16,
		);
	}
	return getPublicKey(tweakedBytes, true).slice(1);
}

function checksumAddress(hex: string): string {
	const hashed = keccak_256(new TextEncoder().encode(hex.toLowerCase()));
	let out = "0x";
	for (let index = 0; index < hex.length; index++) {
		const char = hex[index] as string;
		const nibble =
			index % 2 === 0
				? (hashed[index >> 1] as number) >> 4
				: (hashed[index >> 1] as number) & 0x0f;
		out +=
			/[a-f]/.test(char) && nibble >= 8
				? char.toUpperCase()
				: char.toLowerCase();
	}
	return out;
}

export interface DerivedAddress {
	address: string;
	path: string;
	publicKey: string;
}

export function deriveAddress(
	mnemonic: string,
	input: Derivation,
): DerivedAddress {
	const clean = mnemonic.trim().toLowerCase().replace(/\s+/g, " ");
	if (!validateMnemonic(clean, wordlist)) {
		throw new Error("invalid mnemonic");
	}
	for (const value of [input.account, input.change, input.index]) {
		if (!Number.isInteger(value) || value < 0 || value > 2_147_483_647) {
			throw new Error("invalid derivation value");
		}
	}
	const path = derivationPath(input);
	const master = HDKey.fromMasterSeed(mnemonicToSeedSync(clean));
	const child = master.derive(path);
	if (!child.publicKey || !child.privateKey) {
		throw new Error("derivation failed");
	}
	const compressed = child.publicKey;
	const publicKey = [...compressed]
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
	if (input.coin === "ETH") {
		const uncompressed = getPublicKey(child.privateKey, false).slice(1);
		const digest = keccak_256(uncompressed);
		const hex = [...digest.slice(-20)]
			.map((byte) => byte.toString(16).padStart(2, "0"))
			.join("");
		return { address: checksumAddress(hex), path, publicKey };
	}
	if (input.purpose === 44) {
		const payload = new Uint8Array([
			P2PKH_VERSION[input.coin],
			...hash160(compressed),
		]);
		return { address: base58.encode(payload), path, publicKey };
	}
	if (input.purpose === 49) {
		const redeem = new Uint8Array([0x00, 0x14, ...hash160(compressed)]);
		const payload = new Uint8Array([
			P2SH_VERSION[input.coin],
			...hash160(redeem),
		]);
		return { address: base58.encode(payload), path, publicKey };
	}
	if (input.purpose === 84) {
		const words = bech32.toWords(hash160(compressed));
		return {
			address: bech32.encode(BECH32_HRP[input.coin], [0, ...words]),
			path,
			publicKey,
		};
	}
	const words = bech32m.toWords(taprootOutput(compressed, child.privateKey));
	return {
		address: bech32m.encode(BECH32_HRP[input.coin], [1, ...words]),
		path,
		publicKey,
	};
}
