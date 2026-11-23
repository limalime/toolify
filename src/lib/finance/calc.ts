export type Token =
	| { type: "number"; value: number }
	| { type: "op"; value: "+" | "-" | "*" | "/" | "%" }
	| { type: "paren"; value: "(" | ")" };

export class CalcError extends Error {}

export function tokenize(input: string): Token[] {
	const tokens: Token[] = [];
	let index = 0;
	const text = input.replaceAll("×", "*").replaceAll("÷", "/").replaceAll("−", "-");
	while (index < text.length) {
		const char = text[index] ?? "";
		if (/\s/.test(char)) {
			index += 1;
			continue;
		}
		if (/[0-9.]/.test(char)) {
			let number = "";
			let dots = 0;
			while (index < text.length && /[0-9.]/.test(text[index] ?? "")) {
				const next = text[index] ?? "";
				if (next === ".") {
					dots += 1;
					if (dots > 1) {
						throw new CalcError("bad number");
					}
				}
				number += next;
				index += 1;
			}
			const value = Number(number);
			if (!Number.isFinite(value)) {
				throw new CalcError("bad number");
			}
			tokens.push({ type: "number", value });
			continue;
		}
		if (char === "+" || char === "-" || char === "*" || char === "/" || char === "%") {
			tokens.push({ type: "op", value: char });
			index += 1;
			continue;
		}
		if (char === "(" || char === ")") {
			tokens.push({ type: "paren", value: char });
			index += 1;
			continue;
		}
		throw new CalcError("bad character");
	}
	return tokens;
}

function percentOf(base: number, percent: number): number {
	return (base * percent) / 100;
}

// recursive descent with calculator percent semantics:
// 200 + 10% -> 220, 200 - 10% -> 180, 50 * 10% -> 5, 10% alone -> 0.1
export function evaluate(input: string): number {
	const tokens = tokenize(input);
	let cursor = 0;

	const peek = (): Token | undefined => tokens[cursor];

	const parseExpression = (): number => {
		let value = parseTerm();
		while (true) {
			const token = peek();
			if (token?.type !== "op" || (token.value !== "+" && token.value !== "-")) {
				break;
			}
			cursor += 1;
			const right = parseTerm();
			value = token.value === "+" ? value + right : value - right;
		}
		return value;
	};

	const parseTerm = (): number => {
		let value = parseUnary();
		while (true) {
			const token = peek();
			if (token?.type !== "op" || (token.value !== "*" && token.value !== "/")) {
				break;
			}
			cursor += 1;
			const right = parseUnary();
			if (token.value === "/" && right === 0) {
				throw new CalcError("divide by zero");
			}
			value = token.value === "*" ? value * right : value / right;
		}
		return value;
	};

	function parseUnary(): number {
		const token = peek();
		if (token?.type === "op" && (token.value === "+" || token.value === "-")) {
			cursor += 1;
			const value = parseUnary();
			return token.value === "-" ? -value : value;
		}
		return parsePostfix();
	}

	function parsePostfix(): number {
		let value = parsePrimary();
		while (peek()?.type === "op" && peek()?.value === "%") {
			cursor += 1;
			value /= 100;
		}
		return value;
	}

	function parsePrimary(): number {
		const token = peek();
		if (!token) {
			throw new CalcError("unexpected end");
		}
		if (token.type === "number") {
			cursor += 1;
			return token.value;
		}
		if (token.type === "paren" && token.value === "(") {
			cursor += 1;
			const value = parseExpression();
			const close = peek();
			if (close?.type !== "paren" || close.value !== ")") {
				throw new CalcError("missing paren");
			}
			cursor += 1;
			return value;
		}
		throw new CalcError("unexpected token");
	}

	const result = parseExpression();
	if (cursor < tokens.length) {
		throw new CalcError("trailing input");
	}
	return result;
}

export function formatResult(value: number): string {
	if (!Number.isFinite(value)) {
		return "Error";
	}
	const rounded = Math.round(value * 1e10) / 1e10;
	if (Number.isInteger(rounded)) {
		return String(rounded);
	}
	return rounded.toFixed(10).replace(/0+$/, "").replace(/\.$/, "");
}

// applies a + b% as a percent of a, which is what a pocket calculator
// does. plain evaluation of "200+10%" gives 200.1 otherwise.
export function evaluateCalculator(input: string): number {
	const match = /^(.*?)([+\-*/(])(\d+(?:\.\d+)?)%$/.exec(input.trim());
	if (match) {
		const left = evaluate(match[1] ?? "0");
		const percent = Number(match[3]);
		if (match[2] === "+") {
			return left + percentOf(left, percent);
		}
		if (match[2] === "-") {
			return left - percentOf(left, percent);
		}
	}
	return evaluate(input);
}