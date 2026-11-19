import { getTranslations } from "next-intl/server";
import ToolMenu from "@/components/landing/tool-menu";
import { Link } from "@/i18n/navigation";
import { resolveMenuTools } from "@/lib/menu";

export default async function NotFoundPage() {
	const t = await getTranslations("notfound");
	const landing = await getTranslations("landing");
	const tools = await resolveMenuTools();

	return (
		<div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-16">
			<section className="flex flex-col gap-3">
				<h1 className="font-display text-display">{t("title")}</h1>
				<p className="max-w-prose text-body text-text-2">{t("explanation")}</p>
				<div>
					<Link
						className="inline-flex h-11 items-center justify-center gap-2 bg-blue-500 px-8 text-base font-semibold text-white outline-none transition-[transform,background-color] duration-150 ease-out hover:bg-blue-400 focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2 active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100"
						href="/"
					>
						{t("home")}
					</Link>
				</div>
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
