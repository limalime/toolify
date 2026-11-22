"use client";

import * as Comlink from "comlink";
import { ArrowDown, ArrowUp, FileText, GripVertical, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import Dropzone from "@/components/primitives/dropzone";
import { notify } from "@/components/primitives/notify";
import Field, { FieldLabel } from "@/components/smoothui/field";
import Input from "@/components/smoothui/input";
import Progress from "@/components/smoothui/progress";
import SmoothButton from "@/components/smoothui/smooth-button";
import {
	TabsIndicator,
	TabsList,
	TabsRoot,
	TabsTab,
} from "@/components/smoothui/tabs";
import { inputClass, tabActiveClass } from "@/lib/control-classes";
import { formatBytes } from "@/lib/format";
import { downloadBytes } from "@/lib/images/download";
import {
	MAX_SPLIT_GROUPS,
	PageRangeError,
	parsePageRanges,
} from "@/lib/pdf/ranges";
import { pdfWorker } from "@/lib/pdf/worker-client";

const MAX_PDF_BYTES = 100 * 1024 * 1024;
const PDF_ACCEPT = "application/pdf,.pdf";

type Mode = "merge" | "split";
type Busy = "merge" | "split" | "read" | "zip" | null;

interface PdfFile {
	id: string;
	file: File;
}

interface MergeResult {
	bytes: Uint8Array;
	pages: number;
}

interface SplitPart {
	name: string;
	bytes: Uint8Array;
	pages: number;
}

function isPdf(file: File): boolean {
	return (
		file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
	);
}

function toBuffer(bytes: Uint8Array): ArrayBuffer {
	return bytes.buffer.slice(
		bytes.byteOffset,
		bytes.byteOffset + bytes.byteLength,
	) as ArrayBuffer;
}

export default function PdfTool() {
	const t = useTranslations("tools.pdf-merge-split");
	const tc = useTranslations("common");
	const te = useTranslations("errors");

	const [mode, setMode] = useState<Mode>("merge");
	const [files, setFiles] = useState<PdfFile[]>([]);
	const [splitFile, setSplitFile] = useState<File | null>(null);
	const [pageCount, setPageCount] = useState<number | null>(null);
	const [ranges, setRanges] = useState("");
	const [busy, setBusy] = useState<Busy>(null);
	const [progress, setProgress] = useState<{
		done: number;
		total: number;
	} | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [mergeResult, setMergeResult] = useState<MergeResult | null>(null);
	const [splitParts, setSplitParts] = useState<SplitPart[] | null>(null);

	const counter = useRef(0);
	const dragging = useRef<string | null>(null);
	const splitToken = useRef(0);

	const rangeParse = (() => {
		if (mode !== "split" || pageCount === null) {
			return {
				groups: null as number[][] | null,
				error: null as string | null,
			};
		}
		try {
			return { groups: parsePageRanges(ranges, pageCount), error: null };
		} catch (unknown) {
			if (!(unknown instanceof PageRangeError)) {
				return {
					groups: null,
					error: t("options.invalidRange", { max: pageCount }),
				};
			}
			const message =
				unknown.code === "descending"
					? t("options.descendingRange")
					: unknown.code === "tooMany"
						? t("options.tooManyRanges", { max: MAX_SPLIT_GROUPS })
						: t("options.invalidRange", { max: pageCount });
			return { groups: null, error: message };
		}
	})();

	const addMergeFiles = (picked: File[]) => {
		const accepted: PdfFile[] = [];
		for (const file of picked) {
			if (!isPdf(file)) {
				setError(t("options.notPdf", { name: file.name }));
				continue;
			}
			if (file.size > MAX_PDF_BYTES) {
				setError(
					t("options.tooLarge", {
						name: file.name,
						limit: formatBytes(MAX_PDF_BYTES),
					}),
				);
				continue;
			}
			counter.current += 1;
			accepted.push({ id: `pdf-${counter.current}`, file });
		}
		if (accepted.length > 0) {
			setFiles((current) => [...current, ...accepted]);
			setMergeResult(null);
			setError(null);
		}
	};

	const move = (from: number, to: number) => {
		setFiles((current) => {
			if (
				from < 0 ||
				to < 0 ||
				from >= current.length ||
				to >= current.length
			) {
				return current;
			}
			const next = [...current];
			const [moved] = next.splice(from, 1);
			if (moved) {
				next.splice(to, 0, moved);
			}
			return next;
		});
		setMergeResult(null);
	};

	const removeFile = (id: string) => {
		setFiles((current) => current.filter((item) => item.id !== id));
		setMergeResult(null);
	};

	const addSplitFile = async (picked: File[]) => {
		const file = picked[0];
		if (!file) {
			return;
		}
		if (!isPdf(file)) {
			setError(t("options.notPdf", { name: file.name }));
			return;
		}
		if (file.size > MAX_PDF_BYTES) {
			setError(
				t("options.tooLarge", {
					name: file.name,
					limit: formatBytes(MAX_PDF_BYTES),
				}),
			);
			return;
		}
		splitToken.current += 1;
		const token = splitToken.current;
		setSplitFile(file);
		setPageCount(null);
		setSplitParts(null);
		setError(null);
		setBusy("read");
		try {
			const bytes = await file.arrayBuffer();
			const worker = await pdfWorker();
			const result = await worker.pageCount(bytes);
			if (token !== splitToken.current) {
				return;
			}
			if (!result.ok) {
				setError(te("unreadableFile"));
				setSplitFile(null);
				return;
			}
			setPageCount(result.value);
		} catch {
			if (token === splitToken.current) {
				setError(t("options.engineFailed"));
				setSplitFile(null);
			}
		} finally {
			if (token === splitToken.current) {
				setBusy(null);
			}
		}
	};

	const runMerge = async () => {
		if (busy) {
			return;
		}
		if (files.length < 2) {
			setError(t("options.needTwo"));
			notify.warning(t("options.needTwo"));
			return;
		}
		setBusy("merge");
		setError(null);
		setMergeResult(null);
		setProgress(null);
		try {
			const buffers: ArrayBuffer[] = [];
			for (const item of files) {
				buffers.push(await item.file.arrayBuffer());
			}
			const worker = await pdfWorker();
			const result = await worker.merge(
				Comlink.transfer({ files: buffers }, buffers),
				Comlink.proxy((done: number, total: number) =>
					setProgress({ done, total }),
				),
			);
			if (!result.ok) {
				setError(
					result.code === "unreadable"
						? te("unreadableFile")
						: t("options.engineFailed"),
				);
				return;
			}
			setMergeResult(result.value);
			notify.success(t("options.merged"));
		} catch {
			setError(t("options.engineFailed"));
		} finally {
			setBusy(null);
			setProgress(null);
		}
	};

	const runSplit = async () => {
		if (busy) {
			return;
		}
		if (!splitFile || pageCount === null) {
			setError(t("options.needOne"));
			notify.warning(t("options.needOne"));
			return;
		}
		if (!rangeParse.groups) {
			return;
		}
		const groups = rangeParse.groups;
		setBusy("split");
		setError(null);
		setSplitParts(null);
		setProgress(null);
		try {
			const bytes = await splitFile.arrayBuffer();
			const worker = await pdfWorker();
			const result = await worker.split(
				Comlink.transfer({ bytes, groups }, [bytes]),
				Comlink.proxy((done: number, total: number) =>
					setProgress({ done, total }),
				),
			);
			if (!result.ok) {
				setError(
					result.code === "unreadable"
						? te("unreadableFile")
						: t("options.engineFailed"),
				);
				return;
			}
			setSplitParts(
				result.value.map((part, index) => ({
					name: `part-${index + 1}.pdf`,
					bytes: part,
					pages: groups[index]?.length ?? 0,
				})),
			);
			notify.success(t("options.splitReady"));
		} catch {
			setError(t("options.engineFailed"));
		} finally {
			setBusy(null);
			setProgress(null);
		}
	};

	const downloadZip = async () => {
		if (!splitParts || busy) {
			return;
		}
		setBusy("zip");
		setError(null);
		try {
			const worker = await pdfWorker();
			const result = await worker.zip(
				splitParts.map((part) => ({ name: part.name, bytes: part.bytes })),
			);
			if (!result.ok) {
				setError(tc("engineFailed"));
				return;
			}
			downloadBytes(
				toBuffer(result.value),
				"application/zip",
				t("options.zipName"),
			);
		} catch {
			setError(tc("engineFailed"));
		} finally {
			setBusy(null);
		}
	};

	const percent = progress
		? Math.round((progress.done / Math.max(1, progress.total)) * 100)
		: null;
	const statusText =
		busy === "merge"
			? t("options.merging", {
					done: progress?.done ?? 0,
					total: progress?.total ?? files.length,
				})
			: busy === "split"
				? t("options.splitting", {
						done: progress?.done ?? 0,
						total: progress?.total ?? rangeParse.groups?.length ?? 0,
					})
				: null;

	return (
		<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
			<div className="flex min-w-0 flex-col gap-4">
				<TabsRoot
					onValueChange={(value) => {
						setMode(value as Mode);
						setError(null);
					}}
					value={mode}
				>
					<TabsList variant="segment">
						<TabsTab className={tabActiveClass} value="merge">
							{t("options.modeMerge")}
						</TabsTab>
						<TabsTab className={tabActiveClass} value="split">
							{t("options.modeSplit")}
						</TabsTab>
						<TabsIndicator />
					</TabsList>
				</TabsRoot>

				{mode === "merge" ? (
					<>
						<Dropzone
							accept={PDF_ACCEPT}
							browseLabel={tc("browse")}
							disabled={busy !== null}
							hint={t("options.mergeHint")}
							multiple
							onFiles={addMergeFiles}
						/>
						{files.length > 0 ? (
							<div className="flex flex-col gap-2">
								<div className="flex items-start justify-between gap-2">
									<span className="text-small text-text-2">
										{t("options.reorder")}
									</span>
									<button
										className="shrink-0 whitespace-nowrap text-small text-text-3 underline underline-offset-4 hover:text-text"
										onClick={() => {
											setFiles([]);
											setMergeResult(null);
										}}
										type="button"
									>
										{t("options.clear")}
									</button>
								</div>
								<ol className="flex flex-col gap-2">
									{files.map((item, index) => (
										<li
											className="flex cursor-grab items-center gap-2 rounded-lg border border-border bg-surface p-3 text-small active:cursor-grabbing"
											data-testid={`pdf-file-${index}`}
											draggable={busy === null}
											key={item.id}
											onDragEnd={() => {
												dragging.current = null;
											}}
											onDragOver={(event) => event.preventDefault()}
											onDragStart={() => {
												dragging.current = item.id;
											}}
											onDrop={(event) => {
												event.preventDefault();
												const from = files.findIndex(
													(entry) => entry.id === dragging.current,
												);
												move(from, index);
												dragging.current = null;
											}}
										>
											<GripVertical
												aria-hidden="true"
												className="size-4 shrink-0 text-text-3"
											/>
											<span className="font-display tabular-nums text-text-2">
												{index + 1}
											</span>
											<FileText
												aria-hidden="true"
												className="size-4 shrink-0 text-blue-500"
											/>
											<span className="min-w-0 flex-1 truncate">
												{item.file.name}
											</span>
											<span className="shrink-0 tabular-nums text-text-2">
												{formatBytes(item.file.size)}
											</span>
											<button
												aria-label={t("options.moveUp")}
												className="rounded-md p-1 text-text-3 hover:text-text disabled:opacity-30"
												disabled={index === 0 || busy !== null}
												onClick={() => move(index, index - 1)}
												type="button"
											>
												<ArrowUp aria-hidden="true" className="size-4" />
											</button>
											<button
												aria-label={t("options.moveDown")}
												className="rounded-md p-1 text-text-3 hover:text-text disabled:opacity-30"
												disabled={index === files.length - 1 || busy !== null}
												onClick={() => move(index, index + 1)}
												type="button"
											>
												<ArrowDown aria-hidden="true" className="size-4" />
											</button>
											<button
												aria-label={t("options.remove", {
													name: item.file.name,
												})}
												className="rounded-md p-1 text-text-3 hover:text-error"
												disabled={busy !== null}
												onClick={() => removeFile(item.id)}
												type="button"
											>
												<X aria-hidden="true" className="size-4" />
											</button>
										</li>
									))}
								</ol>
							</div>
						) : null}
						{mergeResult ? (
							<div
								className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5"
								data-testid="pdf-result"
							>
								<p className="font-display text-h3">{t("options.merged")}</p>
								<p className="text-small text-text-2">
									{t("options.resultMeta", {
										count: mergeResult.pages,
										size: formatBytes(mergeResult.bytes.byteLength),
									})}
								</p>
								<SmoothButton
									data-testid="pdf-download"
									onClick={() =>
										downloadBytes(
											toBuffer(mergeResult.bytes),
											"application/pdf",
											"merged.pdf",
										)
									}
									size="sm"
									variant="secondary"
								>
									{tc("download")}
								</SmoothButton>
							</div>
						) : null}
					</>
				) : (
					<>
						<Dropzone
							accept={PDF_ACCEPT}
							browseLabel={tc("browse")}
							disabled={busy !== null}
							hint={t("options.splitHint")}
							onFiles={addSplitFile}
						/>
						{splitFile ? (
							<div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
								<div className="flex items-center gap-2 text-small">
									<FileText
										aria-hidden="true"
										className="size-4 shrink-0 text-blue-500"
									/>
									<span className="min-w-0 flex-1 truncate">
										{splitFile.name}
									</span>
									<span className="shrink-0 tabular-nums text-text-2">
										{formatBytes(splitFile.size)}
									</span>
									<button
										className="shrink-0 text-text-3 underline underline-offset-4 hover:text-text"
										onClick={() => {
											splitToken.current += 1;
											setSplitFile(null);
											setPageCount(null);
											setSplitParts(null);
										}}
										type="button"
									>
										{tc("clear")}
									</button>
								</div>
								<p
									className="text-small text-text-2"
									data-testid="pdf-page-count"
								>
									{pageCount === null
										? t("options.reading")
										: t("options.pageCount", { count: pageCount })}
								</p>
							</div>
						) : null}
						<Field>
							<FieldLabel htmlFor="pdf-ranges">
								{t("options.ranges")}
							</FieldLabel>
							<Input
								aria-invalid={rangeParse.error ? true : undefined}
								className={inputClass}
								data-testid="pdf-range"
								dir="ltr"
								id="pdf-ranges"
								onChange={(event) => {
									setRanges(event.target.value);
									setSplitParts(null);
								}}
								placeholder={t("options.rangesPlaceholder")}
								value={ranges}
							/>
							<p className="text-caption text-text-3">
								{t("options.rangesHint")}
							</p>
							{rangeParse.error ? (
								<p
									className="text-small text-error"
									data-testid="pdf-range-error"
									role="alert"
								>
									{rangeParse.error}
								</p>
							) : null}
							{rangeParse.groups ? (
								<p
									className="text-small text-text-2"
									data-testid="pdf-output-count"
								>
									{t("options.outputCount", {
										count: rangeParse.groups.length,
									})}
								</p>
							) : null}
						</Field>
						{splitParts ? (
							<div
								className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5"
								data-testid="pdf-split-result"
							>
								<p className="font-display text-h3">
									{t("options.splitReady")}
								</p>
								<ul className="flex flex-col gap-2">
									{splitParts.map((part, index) => (
										<li
											className="flex flex-wrap items-center gap-2 border-border border-t pt-2 text-small first:border-t-0 first:pt-0"
											key={part.name}
										>
											<span className="min-w-0 flex-1 truncate">
												{part.name}
											</span>
											<span className="tabular-nums text-text-2">
												{t("options.pages", { count: part.pages })}
											</span>
											<span className="tabular-nums text-text-3">
												{formatBytes(part.bytes.byteLength)}
											</span>
											<SmoothButton
												data-testid={`pdf-part-${index}`}
												onClick={() =>
													downloadBytes(
														toBuffer(part.bytes),
														"application/pdf",
														part.name,
													)
												}
												size="sm"
												variant="secondary"
											>
												{tc("download")}
											</SmoothButton>
										</li>
									))}
								</ul>
								<SmoothButton
									data-testid="pdf-download-all"
									loading={busy === "zip"}
									onClick={downloadZip}
									size="sm"
									variant="secondary"
								>
									{t("options.downloadAll")}
								</SmoothButton>
							</div>
						) : null}
					</>
				)}
			</div>

			<div className="flex h-fit flex-col gap-4 rounded-lg border border-border bg-surface p-5 md:p-6">
				{mode === "merge" ? (
					<p className="text-small text-text-2">{t("options.reorder")}</p>
				) : null}
				<SmoothButton
					className="w-full"
					data-testid="pdf-action"
					disabled={busy !== null}
					loading={busy === "merge" || busy === "split"}
					onClick={mode === "merge" ? runMerge : runSplit}
					size="lg"
				>
					{mode === "merge"
						? t("options.mergeAction")
						: t("options.splitAction")}
				</SmoothButton>
				{statusText ? (
					<div className="flex flex-col gap-2" role="status">
						<p className="text-small text-text-2">{statusText}</p>
						<Progress aria-label={statusText} value={percent} />
					</div>
				) : null}
				{error ? (
					<p
						className="text-small text-error"
						data-testid="pdf-error"
						role="alert"
					>
						{error}
					</p>
				) : null}
				<p className="text-caption text-text-3">{t("options.fileNote")}</p>
			</div>
		</div>
	);
}
