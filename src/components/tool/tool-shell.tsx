import { ChevronRight, ShieldCheck } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Fragment } from "react";
import AdSlot from "@/components/ads/ad-slot";
import ToolCard from "@/components/landing/tool-card";
import type { CategoryKey } from "@/components/layout/categories";
import {
	AccordionHeader,
	AccordionItem,
	AccordionPanel,
	AccordionRoot,
	AccordionTrigger,
} from "@/components/smoothui/accordion";
import { Link } from "@/i18n/navigation";
import { isAnalyticsDisabled } from "@/lib/analytics";
import { accordionClass } from "@/lib/control-classes";
import { faqPageJsonLd, toJsonLd, webApplicationJsonLd } from "@/lib/jsonld";
import type { LocaleCode } from "@/lib/locales";
import { localizedPath } from "@/lib/locales";
import { resolveMenuTools } from "@/lib/menu";
import { absoluteUrl } from "@/lib/site";

export interface ToolStep {
	title: string;
	line: string;
}

export interface ToolFaq {
	q: string;
	a: string;
}

// shared anatomy for every tool page: breadcrumb, h1, the tool itself,
// how-to, faq with json-ld, related tools, and the privacy line.
export default async function ToolShell({
	slug,
	category,
	categoryHref,
	h1,
	sub,
	description,
	toolName,
	steps,
	faqs,
	children,
}: {
	slug: string;
	category: CategoryKey;
	categoryHref: string;
	h1: string;
	sub: string;
	description: string;
	toolName: string;
	steps: ToolStep[];
	faqs: ToolFaq[];
	children: React.ReactNode;
}) {
	const locale = (await getLocale()) as LocaleCode;
	const t = await getTranslations("common");
	const tc = await getTranslations("categories");
	const th = await getTranslations("howto");
	const tf = await getTranslations("faq");
	const tools = await resolveMenuTools();
	const related = tools
		.filter((tool) => tool.category === category && tool.slug !== slug)
		.slice(0, 4);
	const url = absoluteUrl(localizedPath(`/${slug}`, locale));
	const webapp = webApplicationJsonLd({
		name: toolName,
		url,
		description,
		category: tc(category),
	});
	const faq = faqPageJsonLd(
		faqs.map((entry) => ({ question: entry.q, answer: entry.a })),
	);

	return (
		<div
			className="relative mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 md:py-12"
			data-analytics={isAnalyticsDisabled(slug) ? "off" : "on"}
			data-testid="tool-shell"
		>
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-y-0 start-full ms-6 hidden w-40 2xl:block"
				data-ad-rail="tool_sidebar_sticky"
			>
				<div className="pointer-events-auto sticky top-24">
					<AdSlot name="tool_sidebar_sticky" />
				</div>
			</div>
			<script type="application/ld+json">{toJsonLd(webapp)}</script>
			<script type="application/ld+json">{toJsonLd(faq)}</script>
			<nav aria-label="Breadcrumb">
				<ol className="flex flex-wrap items-center gap-1 text-small text-text-3">
					<li>
						<Link
							className="outline-none hover:text-text hover:underline hover:underline-offset-4 focus-visible:text-blue-500"
							href="/"
						>
							{t("home")}
						</Link>
					</li>
					<li aria-hidden="true">
						<ChevronRight className="size-4 rtl:rotate-180" />
					</li>
					<li>
						<Link
							className="outline-none hover:text-text hover:underline hover:underline-offset-4 focus-visible:text-blue-500"
							href={categoryHref}
						>
							{tc(category)}
						</Link>
					</li>
					<li aria-hidden="true">
						<ChevronRight className="size-4 rtl:rotate-180" />
					</li>
					<li aria-current="page" className="text-text-2">
						{toolName}
					</li>
				</ol>
			</nav>
			<div className="flex flex-col gap-3">
				<h1>{h1}</h1>
				<p className="max-w-prose text-body text-text-2">{sub}</p>
			</div>
			<div className="flex flex-col gap-4">{children}</div>
			<AdSlot name="tool_below_tool" />
			<section aria-label={th("title")} className="flex flex-col gap-4">
				<h2>{th("title")}</h2>
				<ol className="flex flex-col gap-3">
					{steps.map((step, index) => (
						<li className="flex items-start gap-3" key={step.title}>
							<span
								aria-hidden="true"
								className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-500 font-display text-small text-white"
							>
								{index + 1}
							</span>
							<span className="flex flex-col gap-1 pt-1">
								<span className="font-display text-h3">{step.title}</span>
								<span className="text-small text-text-2">{step.line}</span>
							</span>
						</li>
					))}
				</ol>
			</section>
			<section aria-label={tf("title")} className="flex flex-col gap-4">
				<h2>{tf("title")}</h2>
				<AccordionRoot className={accordionClass}>
					{faqs.map((entry, index) => (
						<Fragment key={entry.q}>
							<AccordionItem value={`faq-${index}`}>
								<AccordionHeader>
									<AccordionTrigger>{entry.q}</AccordionTrigger>
								</AccordionHeader>
								<AccordionPanel>{entry.a}</AccordionPanel>
							</AccordionItem>
							{index === 1 && faqs.length > 2 ? (
								<AdSlot name="tool_in_faq" />
							) : null}
						</Fragment>
					))}
				</AccordionRoot>
			</section>
			{related.length > 0 ? (
				<section aria-label={t("relatedTools")} className="flex flex-col gap-4">
					<h2>{t("relatedTools")}</h2>
					<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
						{related.map((tool) => (
							<ToolCard key={tool.slug} tool={tool} />
						))}
					</div>
				</section>
			) : null}
			<p className="flex items-center justify-center gap-2 text-center text-small text-text-3">
				<ShieldCheck aria-hidden="true" className="size-4 text-success" />
				{t("filesNeverLeave")}
			</p>
		</div>
	);
}
