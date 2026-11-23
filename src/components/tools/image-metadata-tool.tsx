"use client";

import { Copy, Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import Dropzone from "@/components/primitives/dropzone";
import { notify } from "@/components/primitives/notify";
import SmoothButton from "@/components/smoothui/smooth-button";
import { formatBytes } from "@/lib/format";
import {
	containerStructure,
	type ContainerSegment,
	type ImageSize,
	probeDimensions,
} from "@/lib/images/containers";
import { parseExif, type ExifEntry } from "@/lib/images/exif";
import { MAX_IMAGE_BYTES } from "@/lib/images/formats";
import { downloadBlob } from "@/lib/images/download";

const METADATA_ACCEPT =
	".png,.jpg,.jpeg,.webp,.avif,.gif,.svg,.heic,.heif,image/*";

interface BasicInfo {
	name: string;
	type: string;
	size: number;
	modified: string;
	width: number;
	height: number;
}

export default function ImageMetadataTool() {
	const t = useTranslations("tools.image-metadata");
	const tc = useTranslations("common");
	const te = useTranslations("errors");
	const [info, setInfo] = useState<BasicInfo | null>(null);
	const [exif, setExif] = useState<ExifEntry[]>([]);
	const [structure, setStructure] = useState<ContainerSegment[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [sourceUrl, setSourceUrl] = useState<string | null>(null);
	const url = useRef<string | null>(null);

	const reset = () => {
		if (url.current) {
			URL.revokeObjectURL(url.current);
			url.current = null;
		}
		setInfo(null);
		setExif([]);
		setStructure([]);
		setError(null);
		setSourceUrl(null);
	};

	const addFiles = async (files: File[]) => {
		const [picked] = files;
		if (!picked) {
			return;
		}
		reset();
		if (picked.size > MAX_IMAGE_BYTES) {
			setError(te("tooLarge", { limit: formatBytes(MAX_IMAGE_BYTES) }));
			return;
		}
		const preview = URL.createObjectURL(picked);
		url.current = preview;
		let probed: ImageSize | null = null;
		try {
			const head = await picked.slice(0, 512 * 1024).arrayBuffer();
			const bytes = new Uint8Array(head);
			probed = probeDimensions(bytes);
			setExif(parseExif(head));
			setStructure(containerStructure(bytes));
		} catch {
			setExif([]);
			setStructure([]);
		}
		const image = new window.Image();
		image.onload = () => {
			setSourceUrl(preview);
			const basic: BasicInfo = {
				name: picked.name,
				type: picked.type || "unknown",
				size: picked.size,
				modified: new Date(picked.lastModified).toLocaleString(),
				width: image.naturalWidth,
				height: image.naturalHeight,
			};
			setInfo(basic);
		};
		image.onerror = () => {
			setInfo({
				name: picked.name,
				type: picked.type || "unknown",
				size: picked.size,
				modified: new Date(picked.lastModified).toLocaleString(),
				width: probed?.width ?? 0,
				height: probed?.height ?? 0,
			});
			setError(t("options.noPreview"));
		};
		image.src = preview;
	};

	const json = () =>
		JSON.stringify(
			{
				file: info,
				exif: Object.fromEntries(exif.map((entry) => [entry.tag, entry.value])),
				structure,
			},
			null,
			2,
		);

	const copy = async () => {
		try {
			await navigator.clipboard.writeText(json());
			notify.success(t("options.copied"));
		} catch {
			notify.error(t("options.copy"));
		}
	};

	return (
		<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
			<div className="flex min-w-0 flex-col gap-4">
				<Dropzone
					accept={METADATA_ACCEPT}
					browseLabel={tc("browse")}
					hint={tc("dropHint")}
					onFiles={addFiles}
				/>
				{info ? (
					<div className="grid gap-4 md:grid-cols-[160px_minmax(0,1fr)]">
						{sourceUrl ? (
							<div className="flex items-start">
								{/* biome-ignore lint/performance/noImgElement: local blob preview */}
								<img
									alt={info.name}
									className="max-h-40 w-auto rounded-lg border border-border object-contain"
									src={sourceUrl}
								/>
							</div>
						) : null}
						<dl className="grid gap-2 text-small" data-testid="metadata-basic">
							<div className="flex justify-between gap-3">
								<dt className="text-text-3">{t("options.file")}</dt>
								<dd className="min-w-0 truncate text-end text-text">{info.name}</dd>
							</div>
							<div className="flex justify-between gap-3">
								<dt className="text-text-3">{t("options.type")}</dt>
								<dd className="font-mono text-text">{info.type || "-"}</dd>
							</div>
							<div className="flex justify-between gap-3">
								<dt className="text-text-3">{t("options.size")}</dt>
								<dd className="font-mono text-text">{formatBytes(info.size)}</dd>
							</div>
							<div className="flex justify-between gap-3">
								<dt className="text-text-3">{t("options.dimensions")}</dt>
								<dd className="font-mono text-text">
									{info.width > 0 ? `${info.width} x ${info.height}` : "-"}
								</dd>
							</div>
							<div className="flex justify-between gap-3">
								<dt className="text-text-3">{t("options.modified")}</dt>
								<dd className="text-end text-text">{info.modified}</dd>
							</div>
						</dl>
					</div>
				) : null}
				{error ? (
					<p className="text-small text-warn" role="alert">
						{error}
					</p>
				) : null}
				{info ? (
					<div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
						<h2 className="font-display text-h3">{t("options.exif")}</h2>
						{exif.length > 0 ? (
							<dl className="grid gap-2 text-small" data-testid="metadata-exif">
								{exif.map((entry) => (
									<div
										className="flex justify-between gap-4 border-b border-border pb-2 last:border-0"
										key={entry.tag}
									>
										<dt className="text-text-3">{entry.tag}</dt>
										<dd className="min-w-0 break-words text-end font-mono text-text">
											{entry.value}
										</dd>
									</div>
								))}
							</dl>
						) : (
							<p className="text-small text-text-3">
								{t("options.noExif")}
							</p>
						)}
					</div>
				) : null}
				{info ? (
					<div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
						<h2 className="font-display text-h3">{t("options.structure")}</h2>
						{structure.length > 0 ? (
							<dl
								className="grid gap-2 text-small"
								data-testid="metadata-structure"
							>
								{structure.map((segment, index) => (
									<div
										className="flex items-center justify-between gap-4 border-b border-border pb-2 last:border-0"
										key={`${segment.name}-${index}`}
									>
										<dt className="min-w-0 text-text-3">
											{segment.name}
											{segment.detail ? (
												<span className="ms-2 text-caption text-text-3">
													{segment.detail}
												</span>
											) : null}
										</dt>
										<dd className="shrink-0 font-mono text-text">
											{formatBytes(segment.bytes)}
										</dd>
									</div>
								))}
							</dl>
						) : (
							<p className="text-small text-text-3">
								{t("options.noStructure")}
							</p>
						)}
					</div>
				) : null}
			</div>
			<div className="flex h-fit flex-col gap-4 rounded-lg border border-border bg-surface p-5 md:p-6">
				<p className="text-small text-text-2">{t("options.hint")}</p>
				<SmoothButton disabled={!info} onClick={copy} size="lg" variant="secondary">
					<Copy aria-hidden="true" className="size-4" />
					{t("options.copy")}
				</SmoothButton>
				<SmoothButton
					disabled={!info}
					onClick={() =>
						downloadBlob(
							new Blob([json()], { type: "application/json" }),
							`${info?.name ?? "metadata"}.json`,
						)
					}
					size="lg"
					variant="secondary"
				>
					<Download aria-hidden="true" className="size-4" />
					{t("options.download")}
				</SmoothButton>
				<p className="text-caption text-text-3">{tc("filesNeverLeave")}</p>
			</div>
		</div>
	);
}