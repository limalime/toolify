"use client";

import { Sparkles } from "lucide-react";
import NextImage from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { MenuTool } from "@/components/landing/tool-menu";
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
			className="flex flex-col gap-6"
			data-testid="featured-tools"
		>
			<div className="flex items-start gap-4">
				<span
					aria-hidden="true"
					className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--color-blue-500),#6d4aff)] text-white shadow-glow"
				>
					<Sparkles className="size-7" />
				</span>
				<div className="flex flex-col gap-1">
					<h2 className="font-display text-h1" id="featured-tools-title">
						{t("featuredTitle")}
					</h2>
					<p className="text-body text-text-2">{t("featuredSub")}</p>
				</div>
			</div>
			<div
				aria-busy={picks === null}
				className="grid gap-6 md:grid-cols-3"
				data-testid="featured-grid"
			>
				{picks === null
					? Array.from({ length: FEATURED_COUNT }, (_, index) => (
							<div className="flex flex-col gap-3" key={index}>
								<div className="aspect-[4/3] animate-pulse rounded-2xl bg-surface-2" />
								<div className="h-5 w-2/3 animate-pulse rounded bg-surface-2" />
								<div className="h-4 w-full animate-pulse rounded bg-surface-2" />
							</div>
						))
					: picks.map((pick) => (
							<Link
								className="group flex flex-col gap-3 outline-none"
								data-featured-tool={pick.slug}
								href={`/${pick.slug}`}
								key={pick.slug}
							>
								<span
									className={cn(
										"relative block aspect-[4/3] overflow-hidden rounded-2xl p-3 transition-transform duration-200 ease-out group-hover:-translate-y-1 group-focus-visible:ring-2 group-focus-visible:ring-blue-500 motion-reduce:transition-none md:p-4",
										TONES[pick.tone] ?? TONES.sky,
									)}
								>
									<NextImage
										alt=""
										aria-hidden="true"
										className="rounded-xl object-cover object-top shadow-modal"
										fill
										sizes="(min-width: 768px) 33vw, 100vw"
										src={pick.image}
									/>
								</span>
								<span className="flex flex-col gap-1">
									<span className="font-display text-h3 text-text group-hover:text-blue-500">
										{pick.name}
									</span>
									<span className="line-clamp-2 text-small text-text-2">
										{pick.tagline}
									</span>
								</span>
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
