import {
	Barcode,
	Binary,
	CaseSensitive,
	CaseUpper,
	Crop,
	Drama,
	Eraser,
	FileImage,
	Hash,
	type LucideIcon,
	Maximize2,
	Minimize2,
	QrCode,
	Scaling,
	SlidersHorizontal,
	Spline,
	Stamp,
	Terminal,
	WholeWord,
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
	meme: Drama,
	trace: Spline,
	qr: QrCode,
	barcode: Barcode,
	ascii: Terminal,
	font: CaseSensitive,
	case: CaseUpper,
	count: WholeWord,
	codec: Binary,
	hash: Hash,
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
