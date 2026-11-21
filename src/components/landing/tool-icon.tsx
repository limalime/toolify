import {
	AudioLines,
	AudioWaveform,
	Barcode,
	Binary,
	Braces,
	CaseSensitive,
	CaseUpper,
	CodeXml,
	Crop,
	Disc3,
	Drama,
	Eraser,
	FileDigit,
	FileImage,
	FileVideo,
	Frame,
	Gauge,
	Hash,
	Images,
	ListMusic,
	type LucideIcon,
	Maximize2,
	Minimize2,
	NotebookPen,
	QrCode,
	Scaling,
	Scissors,
	Shrink,
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
	brace: Braces,
	code: CodeXml,
	notes: NotebookPen,
	digits: FileDigit,
	audio: AudioLines,
	gif: Images,
	videofile: FileVideo,
	shrink: Shrink,
	frame: Frame,
	disc: Disc3,
	waveform: AudioWaveform,
	playlist: ListMusic,
	cut: Scissors,
	gauge: Gauge,
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
