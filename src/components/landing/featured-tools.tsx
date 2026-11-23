"use client";

import { Sparkles } from "lucide-react";
import NextImage from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { MenuTool } from "@/components/landing/tool-menu";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import {
	FEATURED_COUNT,
	FEATURED_POOL,
	FEATURED_STORAGE_KEY,
	type FeaturedCache,
	parseFeaturedCache,
	sampleTools,
	weekOf,
} from "@/lib/featured";
import { cn } from "@/lib/utils";

const TONES: Record<string, string> = {
	sand: "bg-[#f3e6c4] dark:bg-[#3a3323]",
	rose: "bg-[#fbe3ec] dark:bg-[#3a2530]",
	mint: "bg-[#ddf2e4] dark:bg-[#1f3529]",
	sky: "bg-[#e2ebff] dark:bg-[#202c44]",
	lilac: "bg-[#ebe3ff] dark:bg-[#2c2540]",
	peach: "bg-[#ffe7d6] dark:bg-[#3b2b22]",
};

interface Pick extends MenuTool {
	image: string;
	tone: string;
}

function randomSeed(): number {
	try {
		const buffer = new Uint32Array(1);
		crypto.getRandomValues(buffer);
		return buffer[0] ?? 0;
	} catch {
		return Math.floor(Math.random() * 4294967296);
	}
}

function readCache(poolSlugs: string[]): FeaturedCache {
	const week = weekOf(Date.now());
	let raw: string | null = null;
	try {
		raw = window.localStorage.getItem(FEATURED_STORAGE_KEY);
	} catch {
		raw = null;
	}
	const cached = parseFeaturedCache(raw, week, poolSlugs);
	if (cached) {
		return cached;
	}
	const seed = randomSeed();
	const next: FeaturedCache = {
		week,
		seed,
		picks: sampleTools(FEATURED_POOL, seed, FEATURED_COUNT).map(
			(entry) => entry.slug,
		),
	};
	try {
		window.localStorage.setItem(FEATURED_STORAGE_KEY, JSON.stringify(next));
	} catch {
		// storage can be blocked, the picks still render for this visit
	}
	return next;
}

export default function FeaturedTools({ tools }: { tools: MenuTool[] }) {
	const t = useTranslations("landing");
	const [picks, setPicks] = useState<Pick[] | null>(null);

	useEffect(() => {
		const bySlug = new Map(tools.map((tool) => [tool.slug, tool]));
		const pool = FEATURED_POOL.filter((entry) => bySlug.has(entry.slug));
		const cache = readCache(pool.map((entry) => entry.slug));
		const next: Pick[] = [];
		for (const slug of cache.picks) {
			const tool = bySlug.get(slug);
			const meta = pool.find((entry) => entry.slug === slug);
			if (tool && meta) {
				next.push({ ...tool, image: meta.image, tone: meta.tone });
			}
		}
		setPicks(next);
	}, [tools]);

	return (
		<section
			aria-labelledby="featured-tools-title"
			className="mt-4 flex flex-col gap-4 md:mt-10"
			data-testid="featured-tools"
		>
			<div className="flex flex-col gap-1">
				<h2
					className="flex items-center gap-2 font-display text-h2"
					id="featured-tools-title"
				>
					<Sparkles aria-hidden="true" className="size-5 text-blue-500" />
					{t("featuredTitle")}
				</h2>
				<p className="text-small text-text-2">{t("featuredSub")}</p>
			</div>
			<div
				aria-busy={picks === null}
				className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:gap-4 md:scroll-px-0 md:px-0 [&::-webkit-scrollbar]:hidden"
				data-testid="featured-grid"
			>
				{picks === null
					? Array.from(
							{ length: FEATURED_COUNT },
							(_, index) => `skeleton-${index + 1}`,
						).map((slot) => (
							<div
								className="flex w-[70%] shrink-0 snap-start flex-col gap-2 md:w-[calc((100%-2rem)/3)]"
								key={slot}
							>
								<div className="aspect-[16/10] animate-pulse rounded-xl bg-surface-2" />
								<div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-surface-2" />
								<div className="h-3 w-full animate-pulse rounded bg-surface-2" />
							</div>
						))
					: picks.map((pick) => (
							<Link
								className="group w-[70%] shrink-0 snap-start outline-none md:w-[calc((100%-2rem)/3)]"
								data-featured-tool={pick.slug}
								href={`/${pick.slug}`}
								key={pick.slug}
							>
								<Card className="h-full gap-0 rounded-none bg-transparent py-0 ring-0">
									<CardContent className="flex flex-col gap-3 px-0">
										<span
											className={cn(
												"relative block aspect-[16/10] overflow-hidden rounded-xl p-2.5 transition-transform duration-200 ease-out group-hover:-translate-y-0.5 group-focus-visible:ring-2 group-focus-visible:ring-blue-500 motion-reduce:transition-none md:p-3",
												TONES[pick.tone] ?? TONES.sky,
											)}
										>
											<NextImage
												alt=""
												aria-hidden="true"
												className="rounded-lg object-contain shadow-modal"
												fill
												loading="eager"
												sizes="(min-width: 768px) 320px, 240px"
												src={pick.image}
											/>
										</span>
										<span className="flex flex-col gap-0.5">
											<span className="truncate font-display text-h3 text-text group-hover:text-blue-500">
												{pick.name}
											</span>
											<span className="line-clamp-2 text-caption text-text-2">
												{pick.tagline}
											</span>
										</span>
									</CardContent>
								</Card>
							</Link>
						))}
			</div>
			{picks === null ? (
				<p className="sr-only" role="status">
					{t("featuredLoading")}
				</p>
			) : null}
		</section>
	);
}
