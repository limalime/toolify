import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import "../globals.css";
import { ThemeProvider } from "next-themes";
import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";
import AppToaster from "@/components/primitives/toaster";
import { routing } from "@/i18n/routing";
import { LOCALES } from "@/lib/locales";
import { SITE_NAME, SITE_URL } from "@/lib/site";

const inter = Inter({
	subsets: ["latin", "latin-ext"],
	variable: "--font-inter",
	display: "swap",
});

export const viewport: Viewport = {
	themeColor: "#0A0E14",
	colorScheme: "dark",
};

export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { locale } = await params;
	if (!hasLocale(routing.locales, locale)) {
		notFound();
	}
	const t = await getTranslations({ locale, namespace: "landing" });
	return {
		metadataBase: new URL(SITE_URL),
		title: {
			default: SITE_NAME,
			template: `%s | ${SITE_NAME}`,
		},
		description: t("metaDescription"),
		icons: {
			icon: "/favicon.ico",
			apple: "/apple-touch-icon.png",
		},
		manifest: "/site.webmanifest",
		openGraph: {
			siteName: SITE_NAME,
			type: "website",
		},
		twitter: {
			card: "summary_large_image",
		},
	};
}

export function generateStaticParams() {
	return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
	children,
	params,
}: Readonly<{
	children: React.ReactNode;
	params: Promise<{ locale: string }>;
}>) {
	const { locale } = await params;
	if (!hasLocale(routing.locales, locale)) {
		notFound();
	}
	const dir = LOCALES.find((entry) => entry.code === locale)?.dir ?? "ltr";

	return (
		<html dir={dir} lang={locale} suppressHydrationWarning>
			<body
				className={`${inter.variable} flex min-h-screen flex-col antialiased`}
			>
				<NextIntlClientProvider>
					<ThemeProvider
						attribute="class"
						defaultTheme="dark"
						enableSystem={false}
					>
						<SiteHeader />
						<main className="flex-1">{children}</main>
						<SiteFooter />
						<AppToaster />
					</ThemeProvider>
				</NextIntlClientProvider>
			</body>
		</html>
	);
}
