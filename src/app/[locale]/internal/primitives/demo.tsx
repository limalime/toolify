"use client";

import { FileSearch } from "lucide-react";
import { useState } from "react";
import Dropzone from "@/components/primitives/dropzone";
import FileList from "@/components/primitives/file-list";
import Loading from "@/components/primitives/loading";
import { notify } from "@/components/primitives/notify";
import {
	AccordionHeader,
	AccordionItem,
	AccordionPanel,
	AccordionRoot,
	AccordionTrigger,
} from "@/components/smoothui/accordion";
import Alert from "@/components/smoothui/alert";
import Badge from "@/components/smoothui/badge";
import Checkbox from "@/components/smoothui/checkbox";
import Dialog from "@/components/smoothui/dialog";
import Empty from "@/components/smoothui/empty";
import Field, {
	FieldControl,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "@/components/smoothui/field";
import Input from "@/components/smoothui/input";
import {
	ProgressIndicator,
	ProgressLabel,
	ProgressRoot,
	ProgressTrack,
	ProgressValue,
} from "@/components/smoothui/progress";
import { Radio, RadioGroup } from "@/components/smoothui/radio-group";
import Select from "@/components/smoothui/select";
import Skeleton from "@/components/smoothui/skeleton";
import Slider from "@/components/smoothui/slider";
import SmoothButton from "@/components/smoothui/smooth-button";
import Switch from "@/components/smoothui/switch";
import {
	TabsIndicator,
	TabsList,
	TabsPanel,
	TabsRoot,
	TabsTab,
} from "@/components/smoothui/tabs";
import Toggle from "@/components/smoothui/toggle";
import {
	accordionClass,
	alertDestructiveClass,
	alertSuccessClass,
	alertWarningClass,
	badgeFreeClass,
	badgeNewClass,
	badgeWarningClass,
	checkboxClass,
	inputClass,
	radioClass,
	selectTriggerClass,
	skeletonClass,
	tabActiveClass,
} from "@/lib/control-classes";
import { cn } from "@/lib/utils";

const SWATCHES: Array<[string, string]> = [
	["blue-300", "#7DA2FE"],
	["blue-400", "#4D7DFE"],
	["blue-500", "#1B56FD"],
	["blue-600", "#1443C8"],
	["blue-700", "#0F3196"],
	["bg", "#0A0E14"],
	["surface", "#12181F"],
	["surface-2", "#1A2230"],
	["border", "#1E293B"],
	["text", "#F1F5F9"],
	["text-2", "#94A3B8"],
	["text-3", "#64748B"],
	["success", "#2ED573"],
	["warning", "#FFB020"],
	["error", "#FF5C5C"],
	["info", "#3E9CFF"],
];

function Section({
	children,
	id,
	title,
}: {
	children: React.ReactNode;
	id: string;
	title: string;
}) {
	return (
		<section
			className="flex flex-col gap-4"
			data-testid={`section-${id}`}
			id={id}
		>
			<h2>{title}</h2>
			{children}
		</section>
	);
}

export default function PrimitivesDemo() {
	const [quality, setQuality] = useState(85);
	const [picked, setPicked] = useState<string[]>([]);

	return (
		<div className="mx-auto flex w-full max-w-4xl flex-col gap-12 px-4 py-8">
			<div>
				<h1>Primitives</h1>
				<p className="text-body text-text-2">
					Every shared control on one page. Internal demo, not indexed.
				</p>
			</div>

			<Section id="tokens" title="Tokens">
				<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
					{SWATCHES.map(([name, hex]) => (
						<div className="border border-border bg-surface p-3" key={name}>
							<div
								className="h-10 w-full border border-border"
								style={{ backgroundColor: hex }}
							/>
							<p className="mt-2 text-small text-text">{name}</p>
							<p className="text-caption text-text-3">{hex}</p>
						</div>
					))}
				</div>
				<div className="flex flex-col gap-2 border border-border bg-surface p-5">
					<p className="font-display text-display">Display 40</p>
					<p className="font-display text-h1">Heading 1, 32</p>
					<p className="font-display text-h2">Heading 2, 24</p>
					<p className="font-display text-h3">Heading 3, 20</p>
					<p className="text-body">
						Body 16, the quick brown fox jumps over the lazy dog.
					</p>
					<p className="text-small">Small 14, labels and table cells.</p>
					<p className="text-caption">Caption 12, hints and timestamps.</p>
					<p className="eyebrow text-caption text-text-3">
						Eyebrow micro label
					</p>
				</div>
			</Section>

			<Section id="buttons" title="Buttons">
				<div className="flex flex-wrap items-center gap-3">
					<SmoothButton size="lg">Candy default</SmoothButton>
					<SmoothButton color="blue" size="lg" variant="solid">
						Convert
					</SmoothButton>
					<SmoothButton className="border border-border" variant="secondary">
						Cancel
					</SmoothButton>
					<SmoothButton color="destructive" variant="solid">
						Delete
					</SmoothButton>
					<SmoothButton loading variant="secondary">
						Saving
					</SmoothButton>
					<SmoothButton disabled variant="secondary">
						Disabled
					</SmoothButton>
				</div>
			</Section>

			<Section id="inputs" title="Inputs">
				<div className="grid gap-4 md:grid-cols-2">
					<Field>
						<FieldLabel htmlFor="demo-name">File name</FieldLabel>
						<FieldControl
							className={inputClass}
							id="demo-name"
							placeholder="photo-final"
						/>
						<FieldDescription>Letters, numbers, and dashes.</FieldDescription>
					</Field>
					<Field invalid>
						<FieldLabel htmlFor="demo-email">Email</FieldLabel>
						<FieldControl
							className={inputClass}
							id="demo-email"
							type="email"
							value="not-an-email"
							onChange={() => {}}
						/>
						<FieldError>Enter an address like name@example.com.</FieldError>
					</Field>
				</div>
				<div>
					<label
						className="mb-1.5 block text-sm font-medium"
						htmlFor="demo-search"
					>
						Search tools
					</label>
					<Input
						className={inputClass}
						id="demo-search"
						placeholder="png to jpg"
						type="search"
					/>
				</div>
			</Section>

			<Section id="select" title="Select">
				<Select
					aria-label="Output format"
					className={selectTriggerClass}
					defaultValue="jpg"
					onValueChange={(value) => notify.info(`Format picked: ${value}`)}
					options={[
						{ label: "PNG image", value: "png" },
						{ label: "JPG image", value: "jpg" },
						{ label: "WEBP image", value: "webp" },
					]}
					placeholder="Pick a format"
				/>
			</Section>

			<Section id="slider" title="Slider">
				<div className="flex items-center gap-4">
					<span className="text-small text-text-2" id="demo-quality-label">
						Quality
					</span>
					<Slider
						aria-label="Quality"
						max={100}
						min={0}
						onValueChange={setQuality}
						value={quality}
					/>
					<output
						aria-labelledby="demo-quality-label"
						className="font-display text-h3 tabular-nums"
					>
						{quality}
					</output>
				</div>
			</Section>

			<Section id="choices" title="Switch, checkbox, radio, toggle">
				<div className="flex flex-col gap-4">
					{/* biome-ignore lint/a11y/noLabelWithoutControl: wrapping label, the switch renders a labelable button */}
					<label className="flex cursor-pointer items-center gap-3 text-small text-text">
						<Switch defaultChecked />
						Keep aspect ratio
					</label>
					{/* biome-ignore lint/a11y/noLabelWithoutControl: wrapping label, the checkbox renders a labelable button */}
					<label className="flex cursor-pointer items-center gap-3 text-small text-text">
						<Checkbox className={checkboxClass} />
						Add watermark
					</label>
					<RadioGroup aria-label="Resize mode" defaultValue="pixels">
						<Radio className={radioClass} value="pixels">
							By pixels
						</Radio>
						<Radio className={radioClass} value="percent">
							By percent
						</Radio>
					</RadioGroup>
					<div>
						<Toggle aria-label="Bold">Bold</Toggle>
					</div>
				</div>
			</Section>

			<Section id="tabs" title="Tabs">
				<TabsRoot defaultValue="convert">
					<TabsList>
						<TabsTab className={tabActiveClass} value="convert">
							Convert
						</TabsTab>
						<TabsTab className={tabActiveClass} value="compress">
							Compress
						</TabsTab>
						<TabsIndicator />
					</TabsList>
					<TabsPanel value="convert">
						Convert picks the output format first.
					</TabsPanel>
					<TabsPanel value="compress">
						Compress picks a target size first.
					</TabsPanel>
				</TabsRoot>
			</Section>

			<Section id="accordion" title="Accordion">
				<AccordionRoot className={accordionClass} defaultValue={["q1"]}>
					<AccordionItem value="q1">
						<AccordionHeader>
							<AccordionTrigger>Do my files leave the browser</AccordionTrigger>
						</AccordionHeader>
						<AccordionPanel>No, everything runs on your device.</AccordionPanel>
					</AccordionItem>
					<AccordionItem value="q2">
						<AccordionHeader>
							<AccordionTrigger>Is there a file size limit</AccordionTrigger>
						</AccordionHeader>
						<AccordionPanel>
							Heavy tools cap the input size and say so up front.
						</AccordionPanel>
					</AccordionItem>
				</AccordionRoot>
			</Section>

			<Section id="dialog" title="Dialog">
				<Dialog
					description="This removes the file from the list. The original stays on your device."
					footer={
						<div className="flex gap-3">
							<SmoothButton color="destructive" variant="solid">
								Remove
							</SmoothButton>
						</div>
					}
					title="Remove file"
					trigger={<SmoothButton variant="secondary">Open dialog</SmoothButton>}
				/>
			</Section>

			<Section id="toast" title="Toast">
				<div className="flex flex-wrap gap-3">
					<SmoothButton
						onClick={() => notify.success("Saved", "Your file is ready below.")}
						variant="secondary"
					>
						Fire success
					</SmoothButton>
					<SmoothButton
						onClick={() =>
							notify.warning("Large file", "This one takes a while to process.")
						}
						variant="secondary"
					>
						Fire warning
					</SmoothButton>
					<SmoothButton
						onClick={() =>
							notify.error(
								"Could not read file",
								"It may be corrupted. Try another file.",
							)
						}
						variant="secondary"
					>
						Fire error
					</SmoothButton>
				</div>
			</Section>

			<Section id="progress" title="Progress">
				<ProgressRoot value={65}>
					<div className="flex items-center justify-between gap-2">
						<ProgressLabel>Converting vacation.mp4</ProgressLabel>
						<ProgressValue />
					</div>
					<ProgressTrack className="bg-surface-2" size="sm">
						<ProgressIndicator />
					</ProgressTrack>
				</ProgressRoot>
				<ProgressRoot aria-label="Loading model" value={null}>
					<ProgressTrack className="bg-surface-2" size="sm">
						<ProgressIndicator />
					</ProgressTrack>
				</ProgressRoot>
			</Section>

			<Section id="skeleton" title="Skeleton">
				<div className="flex flex-col gap-2">
					<Skeleton className={cn(skeletonClass, "h-5 w-2/3")} />
					<Skeleton className={cn(skeletonClass, "h-5 w-full")} />
					<Skeleton className={cn(skeletonClass, "h-5 w-1/3")} />
				</div>
			</Section>

			<Section id="empty" title="Empty state">
				<Empty
					action={
						<SmoothButton color="blue" variant="solid">
							Browse files
						</SmoothButton>
					}
					description="No files yet. Drop a file to start."
					icon={<FileSearch />}
					title="Nothing here"
				/>
			</Section>

			<Section id="alert" title="Alerts">
				<div className="flex flex-col gap-3">
					<Alert title="Heads up" variant="info">
						AVIF output keeps transparency.
					</Alert>
					<Alert className={alertSuccessClass} title="Done" variant="success">
						3 files converted.
					</Alert>
					<Alert
						className={alertWarningClass}
						title="Large file"
						variant="warning"
					>
						Files over 100 MB take a while.
					</Alert>
					<Alert
						className={alertDestructiveClass}
						title="Conversion failed"
						variant="destructive"
					>
						<div className="flex flex-col items-start gap-2">
							<span>Could not read this file. It may be corrupted.</span>
							<SmoothButton size="sm" variant="secondary">
								Retry
							</SmoothButton>
						</div>
					</Alert>
				</div>
			</Section>

			<Section id="badges" title="Badges">
				<div className="flex flex-wrap gap-2">
					<Badge className={badgeFreeClass}>Free</Badge>
					<Badge className={badgeNewClass}>New</Badge>
					<Badge className={badgeWarningClass}>Beta</Badge>
					<Badge variant="destructive">Hot</Badge>
				</div>
			</Section>

			<Section id="dropzone" title="Dropzone">
				<Dropzone
					browseLabel="click to browse"
					hint="Drop files here or"
					multiple
					onFiles={(files) => setPicked(files.map((file) => file.name))}
				/>
				{picked.length > 0 ? (
					<ul className="text-small text-text-2">
						{picked.map((name) => (
							<li key={name}>{name}</li>
						))}
					</ul>
				) : null}
			</Section>

			<Section id="file-list" title="File list">
				<FileList
					files={[
						{ id: "1", name: "photo.png", size: 2457600, status: "queued" },
						{
							id: "2",
							name: "vacation.mp4",
							progress: 45,
							size: 52428800,
							status: "processing",
						},
						{
							downloadUrl: "data:text/plain,downloaded",
							id: "3",
							name: "notes.pdf",
							size: 102400,
							status: "done",
						},
						{
							error:
								"Could not read this file. It may be corrupted. Try another file.",
							id: "4",
							name: "broken.jpg",
							size: 88100,
							status: "failed",
						},
					]}
					onRetry={(id) => notify.info(`Retry queued for row ${id}`)}
					labels={{
						converting: (name) => `Converting ${name}`,
						download: "Download",
						retry: "Retry",
					}}
				/>
			</Section>

			<Section id="loading" title="Loading">
				<Loading status="Converting 3 of 5 files" />
			</Section>
		</div>
	);
}
