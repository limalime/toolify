"use client";

import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import { THEME_STORAGE_KEY } from "@/lib/theme-script";

type Theme = "light" | "dark";

interface ThemeState {
	resolvedTheme: Theme;
	setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeState | null>(null);

function storedTheme(): Theme {
	try {
		return window.localStorage.getItem(THEME_STORAGE_KEY) === "light"
			? "light"
			: "dark";
	} catch {
		return "dark";
	}
}

// two themes only. the inline script paints the stored one, this keeps the
// toggle and the document in step after hydration.
export function ThemeProvider({ children }: { children: ReactNode }) {
	const [theme, setThemeState] = useState<Theme>("dark");

	useEffect(() => {
		setThemeState(storedTheme());
	}, []);

	const setTheme = useCallback((next: Theme) => {
		setThemeState(next);
		document.documentElement.classList.toggle("dark", next === "dark");
		try {
			window.localStorage.setItem(THEME_STORAGE_KEY, next);
		} catch {
			// storage can be blocked. the class change still holds for this page.
		}
	}, []);

	const value = useMemo(
		() => ({ resolvedTheme: theme, setTheme }),
		[theme, setTheme],
	);

	return (
		<ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
	);
}

export function useTheme(): ThemeState {
	const value = useContext(ThemeContext);
	if (!value) {
		throw new Error("useTheme must be used inside ThemeProvider");
	}
	return value;
}
