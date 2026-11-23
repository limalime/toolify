import Image from "next/image";
import { getTranslations } from "next-intl/server";
import NotFoundHome from "@/components/landing/not-found-home";
import ToolMenu from "@/components/landing/tool-menu";
import { resolveMenuTools } from "@/lib/menu";

export default async function NotFoundPage() {
	const t = await getTranslations("notfound");
	const landing = await getTranslations("landing");
	const tools = await resolveMenuTools();

	return (
		<div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-12 md:py-16">
			<section className="flex flex-col items-center gap-5 text-center">
				<Image
					alt={t("artAlt")}
					className="h-auto w-full max-w-md dark:hidden"
					height={442}
					priority
					src="/assets/notfound-cat-404.svg"
					width={723}
				/>
				<Image
					alt={t("artAlt")}
					className="hidden h-auto w-full max-w-md dark:block"
					height={442}
					priority
					src="/assets/notfound-cat-404-dark.svg"
					width={723}
				/>
				<div className="flex max-w-xl flex-col gap-3">
					<h1 className="font-display text-display">{t("title")}</h1>
					<p className="text-body text-text-2">{t("explanation")}</p>
				</div>
				<NotFoundHome label={t("home")} />
			</section>
			<ToolMenu
				copy={{
					emptyClear: landing("emptyClear"),
					emptyTitle: landing("emptyTitle"),
					searchLabel: landing("searchLabel"),
					searchPlaceholder: landing("searchPlaceholder"),
				}}
				tools={tools}
			/>
		</div>
	);
}