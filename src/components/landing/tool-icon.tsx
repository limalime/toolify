import {
	Crop,
	Eraser,
	FileImage,
	type LucideIcon,
	Maximize2,
	Minimize2,
	Scaling,
	SlidersHorizontal,
	Stamp,
	Wrench,
} from "lucide-react";

// one icon per tool family, registered by the phase that ships the tool.
// unknown names fall back to the wrench so a missing icon stays visible.
export const TOOL_ICONS: Record<string, LucideIcon> = {
	converter: FileImage,
	compress: Minimize2,
	resize: Scaling,
	crop: Crop,
	watermark: Stamp,
	enhance: SlidersHorizontal,
	background: Eraser,
	upscale: Maximize2,
};

export default function ToolIcon({
	name,
	className,
}: {
	name: string;
	className?: string;
}) {
	const Icon = TOOL_ICONS[name] ?? Wrench;
	return <Icon aria-hidden="true" className={className} />;
}
