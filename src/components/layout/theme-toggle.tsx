"use client";

import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useTheme } from "@/components/layout/theme-provider";

// sun and moon toggle. renders a same-size placeholder until mounted so
// the server html matches and the navbar never shifts.
export default function ThemeToggle() {
	const { resolvedTheme, setTheme } = useTheme();
	const t = useTranslations("header");
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) {
		return <span aria-hidden="true" className="inline-block size-11" />;
	}

	const dark = resolvedTheme !== "light";

	return (
		<button
			aria-label={dark ? t("themeToLight") : t("themeToDark")}
			className="inline-flex size-11 cursor-pointer items-center justify-center text-text-2 outline-none hover:text-text focus-visible:border-blue-500"
			onClick={() => setTheme(dark ? "light" : "dark")}
			type="button"
		>
			<span className="relative block size-5" aria-hidden="true">
				<Sun
					className={`absolute inset-0 size-5 transition-all duration-200 ease-out motion-reduce:transition-none ${
						dark ? "rotate-0 opacity-100" : "rotate-90 opacity-0"
					}`}
				/>
				<Moon
					className={`absolute inset-0 size-5 transition-all duration-200 ease-out motion-reduce:transition-none ${
						dark ? "-rotate-90 opacity-0" : "rotate-0 opacity-100"
					}`}
				/>
			</span>
		</button>
	);
}
