"use client";

import * as Comlink from "comlink";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import Dropzone from "@/components/primitives/dropzone";
import { notify } from "@/components/primitives/notify";
import {
	ProgressIndicator,
	ProgressRoot,
	ProgressTrack,
} from "@/components/smoothui/progress";
import SmoothButton from "@/components/smoothui/smooth-button";
import {
	TabsIndicator,
	TabsList,
	TabsRoot,
	TabsTab,
} from "@/components/smoothui/tabs";
import { tabActiveClass } from "@/lib/control-classes";
import { formatBytes } from "@/lib/format";
import { downloadBytes } from "@/lib/images/download";
import {
	MAX_IMAGE_BYTES,
	MAX_IMAGE_PIXELS,
	RASTER_ACCEPT,
	stemOf,
} from "@/lib/images/formats";
import { imageWorker } from "@/lib/images/worker-client";
import { BG_REMOVAL_PUBLIC_PATH } from "@/lib/r2";

type Model = "isnet_quint8" | "isnet_fp16";

interface Result {
	bytes: ArrayBuffer;
	filename: string;
	url: string;
	device: string;
}

export default function RemoveBackgroundTool() {
	const t = useTranslations("tools.remove-background");
	const tc = useTranslations("common");
	const te = useTranslations("errors");
	const [file, setFile] = useState<File | null>(null);
	const [model, setModel] = useState<Model>("isnet_quint8");
	const [loading, setLoading] = useState(false);
	const [running, setRunning] = useState(false);
	const [progress, setProgress] = useState<{
		stage: string;
		current: number;
		total: number;
	} | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [result, setResult] = useState<Result | null>(null);
	const [ranModels, setRanModels] = useState<Model[]>([]);
	const bytes = useRef<ArrayBuffer | null>(null);
	const mime = useRef("image/png");
	const urls = useRef<string[]>([]);

	const reset = () => {
		for (const url of urls.current) {
			URL.revokeObjectURL(url);
		}
		urls.current = [];
		bytes.current = null;
		setFile(null);
		setError(null);
		setResult(null);
		setProgress(null);
	};

	const addFiles = async (files: File[]) => {
		const [picked] = files;
		if (!picked) {
			return;
		}
		reset();
		const extension = picked.name
			.slice(picked.name.lastIndexOf(".") + 1)
			.toLowerCase();
		if (!["png", "jpg", "jpeg", "webp", "avif"].includes(extension)) {
			setFile(picked);
			setError(te("unsupported"));
			return;
		}
		if (picked.size > MAX_IMAGE_BYTES) {
			setFile(picked);
			setError(te("tooLarge", { limit: formatBytes(MAX_IMAGE_BYTES) }));
			return;
		}
		setFile(picked);
		setLoading(true);
		try {
			const worker = await imageWorker();
			const image = await worker.decodeInput(
				await picked.arrayBuffer(),
				picked.name,
			);
			if (image.width * image.height > MAX_IMAGE_PIXELS) {
				setError(te("tooLarge", { limit: "64 MP" }));
				return;
			}
			bytes.current = await picked.arrayBuffer();
			mime.current = picked.type || "image/png";
		} catch (unknown) {
			if (process.env.NODE_ENV !== "production") {
				console.error(unknown);
			}
			setError(te("unreadableFile"));
		} finally {
			setLoading(false);
		}
	};

	const apply = async () => {
		if (!file || !bytes.current || running) {
			if (!file) {
				notify.warning(tc("needFiles"));
			}
			return;
		}
		setRunning(true);
		setError(null);
		setResult(null);
		setProgress({ stage: "download", current: 0, total: 1 });
		try {
			const worker = await imageWorker();
			const gpu = "gpu" in globalThis.navigator;
			const encoded = await worker.removeBackgroundImage(
				bytes.current,
				mime.current,
				{
					publicPath: BG_REMOVAL_PUBLIC_PATH,
					model,
					device: gpu ? "gpu" : "cpu",
				},
				Comlink.proxy((stage: string, current: number, total: number) => {
					setProgress({ stage, current, total });
				}),
			);
			const filename = `${stemOf(file.name)}-nobg.${encoded.extension}`;
			const url = URL.createObjectURL(
				new Blob([encoded.bytes], { type: encoded.mime }),
			);
			urls.current.push(url);
			setResult({
				bytes: encoded.bytes,
				filename,
				url,
				device: gpu ? t("options.usedWebgpu") : t("options.usedCpu"),
			});
			setRanModels((ran) => (ran.includes(model) ? ran : [...ran, model]));
		} catch (unknown) {
			if (process.env.NODE_ENV !== "production") {
				console.error(unknown);
			}
			setError(te("unreadableFile"));
		} finally {
			setRunning(false);
			setProgress(null);
		}
	};

	const percent =
		progress && progress.total > 0
			? Math.round((progress.current / progress.total) * 100)
			: null;

	return (
		<div className="grid gap-6 lg:grid-cols-[1fr_320px]">
			<div className="flex min-w-0 flex-col gap-4">
				<Dropzone
					accept={RASTER_ACCEPT}
					browseLabel={tc("browse")}
					disabled={running}
					hint={tc("dropHint")}
					onFiles={addFiles}
				/>
				{error ? (
					<p className="text-small text-error" role="alert">
						{error}
					</p>
				) : null}
				{result ? (
					<div className="flex flex-col gap-3 border border-border bg-surface p-5">
						{/* biome-ignore lint/performance/noImgElement: blob url, next-image cannot optimize object urls */}
						<img
							alt={result.filename}
							className="h-auto w-full rounded-lg"
							src={result.url}
						/>
						<p className="font-display text-small text-text-2">
							{result.device}
						</p>
						<SmoothButton
							onClick={() =>
								downloadBytes(result.bytes, "image/png", result.filename)
							}
							size="sm"
							variant="secondary"
						>
							{tc("download")}
						</SmoothButton>
					</div>
				) : null}
			</div>
			<div className="flex h-fit flex-col gap-4 rounded-lg border border-border bg-surface p-5 md:p-6">
				<div className="flex flex-col gap-2">
					<span className="text-small font-medium" id="bg-model-label">
						{t("options.model")}
					</span>
					<TabsRoot
						defaultValue="isnet_quint8"
						onValueChange={(value) => setModel(value as Model)}
					>
						<TabsList aria-labelledby="bg-model-label">
							<TabsTab className={tabActiveClass} value="isnet_quint8">
								{t("options.fast")}
							</TabsTab>
							<TabsTab className={tabActiveClass} value="isnet_fp16">
								{t("options.quality")}
							</TabsTab>
							<TabsIndicator />
						</TabsList>
					</TabsRoot>
				</div>
				{ranModels.includes(model) && !running ? (
					<p className="text-small text-text-2" data-testid="bg-cached">
						{t("options.cached")}
					</p>
				) : null}
				<SmoothButton
					className="w-full"
					disabled={running || loading}
					loading={running}
					onClick={apply}
					size="lg"
				>
					{t("options.apply")}
				</SmoothButton>
				{running ? (
					<div className="flex flex-col gap-2">
						<div className="flex items-center justify-between gap-2">
							<span className="text-small text-text-2" data-testid="bg-stage">
								{progress?.stage === "inference"
									? t("options.working")
									: t("options.downloading")}
							</span>
							{percent !== null ? (
								<output className="font-display text-small tabular-nums">
									{percent}%
								</output>
							) : null}
						</div>
						<ProgressRoot aria-label={t("options.apply")} value={percent}>
							<ProgressTrack className="bg-surface-2" size="sm">
								<ProgressIndicator />
							</ProgressTrack>
						</ProgressRoot>
					</div>
				) : null}
			</div>
		</div>
	);
}
