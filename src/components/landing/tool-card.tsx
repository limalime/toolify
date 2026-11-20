import ToolIcon from "@/components/landing/tool-icon";
import { Link } from "@/i18n/navigation";

export interface ToolCardData {
	slug: string;
	name: string;
	tagline: string;
	icon: string;
}

// one app-menu card. shared by the landing grid and related tools.
export default function ToolCard({ tool }: { tool: ToolCardData }) {
	return (
		<Link
			className="flex min-h-44 flex-col gap-3 rounded-lg border border-border bg-surface p-5 transition-[border-color,box-shadow,transform] duration-150 ease-out outline-none hover:border-blue-500 hover:shadow-glow focus-visible:border-blue-500 active:translate-y-px motion-reduce:transition-none md:p-6"
			data-tool-card={tool.slug}
			href={`/${tool.slug}`}
		>
			<ToolIcon className="size-6 text-blue-500" name={tool.icon} />
			<span className="flex flex-col gap-1">
				<span className="font-display text-h3">{tool.name}</span>
				<span className="text-small text-text-2">{tool.tagline}</span>
			</span>
		</Link>
	);
}
