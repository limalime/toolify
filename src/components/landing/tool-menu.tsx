"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import ToolCard from "@/components/landing/tool-card";
import Empty from "@/components/smoothui/empty";
import Input from "@/components/smoothui/input";
import SmoothButton from "@/components/smoothui/smooth-button";
import { inputClass } from "@/lib/control-classes";
import { CATEGORY_ANCHORS, type ToolEntry, toolsByCategory } from "@/lib/tools";
import { cn } from "@/lib/utils";

export interface MenuTool extends ToolEntry {
	name: string;
	tagline: string;
	categoryLabel: string;
}

export interface ToolMenuCopy {
	searchPlaceholder: string;
	searchLabel: string;
	emptyTitle: string;
	emptyClear: string;
}

// live search plus the grouped tool grid. renders only tools that exist,
// so every card links to a working page by construction.
export default function ToolMenu({
	tools,
	copy,
}: {
	tools: MenuTool[];
	copy: ToolMenuCopy;
}) {
	const [query, setQuery] = useState("");

	const groups = useMemo(() => {
		const needle = query.trim().toLowerCase();
		const matching = needle
			? tools.filter(
					(tool) =>
						tool.name.toLowerCase().includes(needle) ||
						tool.categoryLabel.toLowerCase().includes(needle),
				)
			: tools;
		const bySlug = new Map(matching.map((tool) => [tool.slug, tool]));
		return toolsByCategory(matching).map((group) => ({
			...group,
			tools: group.tools.map((tool) => bySlug.get(tool.slug) as MenuTool),
		}));
	}, [query, tools]);

	const searching = query.trim().length > 0;

	return (
		<div className="flex flex-col gap-8">
			<div className="relative scroll-mt-20" id="search">
				<Search
					aria-hidden="true"
					className="pointer-events-none absolute top-1/2 start-3 size-5 -translate-y-1/2 text-text-3"
				/>
				<Input
					aria-label={copy.searchLabel}
					className={cn(inputClass, "ps-10")}
					onChange={(event) => setQuery(event.target.value)}
					placeholder={copy.searchPlaceholder}
					type="search"
					value={query}
				/>
			</div>
			{groups.length === 0 && searching ? (
				<Empty
					action={
						<SmoothButton onClick={() => setQuery("")} variant="secondary">
							{copy.emptyClear}
						</SmoothButton>
					}
					title={copy.emptyTitle}
				/>
			) : (
				groups.map((group) => (
					<section
						aria-label={group.tools[0]?.categoryLabel}
						id={CATEGORY_ANCHORS[group.category]}
						key={group.category}
					>
						<h2 className="eyebrow text-caption text-text-3">
							{group.tools[0]?.categoryLabel}
						</h2>
						<div className="mt-3 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
							{group.tools.map((tool) => (
								<ToolCard key={tool.slug} tool={tool} />
							))}
						</div>
					</section>
				))
			)}
		</div>
	);
}
