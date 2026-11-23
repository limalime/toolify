"use client";

import { ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import Dropzone from "@/components/primitives/dropzone";
import Field, { FieldControl, FieldLabel } from "@/components/smoothui/field";
import SmoothButton from "@/components/smoothui/smooth-button";
import { inputClass } from "@/lib/control-classes";
import { formatBytes } from "@/lib/format";
import { MAX_PDF_BYTES } from "@/lib/pdf/compress";
import { pdfWorker } from "@/lib/pdf/worker-client";

export default function PdfViewerTool() {
	const t = useTranslations("tools.pdf-viewer");
	const tc = useTranslations("common");
	const te = useTranslations("errors");
	const [file, setFile] = useState<File | null>(null);
	const [pages, setPages] = useState(0);
	const [page, setPage] = useState(1);
	const [scale, setScale] = useState(1.1);
	const [loading, setLoading] = useState(false);
	const [rendering, setRendering] = useState(false);
	const [renderedPage, setRenderedPage] = useState<number | null>(null);
	const [error, setError] = useState<string | null>(null);
	const canvas = useRef<HTMLCanvasElement>(null);
	const generation = useRef(0);
	const queue = useRef<Promise<void>>(Promise.resolve());

	const clearCanvas = useCallback(() => {
		const target = canvas.current;
		if (target) {
			target.width = 0;
			target.height = 0;
		}
	}, []);

	const resetViewer = useCallback(() => {
		generation.current += 1;
		setRendering(false);
		setRenderedPage(null);
		clearCanvas();
		pdfWorker()
			.then((worker) => worker.cancelRender())
			.catch(() => undefined);
	}, [clearCanvas]);

	useEffect(() => {
		if (pages <= 0) {
			return;
		}
		const request = ++generation.current;
		let cancelled = false;
		setError(null);
		setRenderedPage(null);
		setRendering(true);
		clearCanvas();

		const run = async () => {
			if (cancelled || generation.current !== request) {
				return;
			}
			try {
				const worker = await pdfWorker();
				if (cancelled || generation.current !== request) {
					return;
				}
				// drop any render still drawing into the old canvas
				await worker.cancelRender();
				if (cancelled || generation.current !== request) {
					return;
				}
				const result = await worker.renderPage(page, scale);
				if (cancelled || generation.current !== request) {
					return;
				}
				if (!result.ok) {
					if (result.code !== "cancelled") {
						console.error(
							"[pdf-viewer] render failed",
							result.detail ?? result.code,
						);
						setError(t("options.renderError"));
					}
					return;
				}
				const target = canvas.current;
				if (!target) {
					return;
				}
				target.width = result.value.width;
				target.height = result.value.height;
				const context = target.getContext("2d");
				if (!context) {
					setError(t("options.renderError"));
					return;
				}
				context.drawImage(result.value.bitmap, 0, 0);
				result.value.bitmap.close();
				setRenderedPage(page);
			} catch (unknown) {
				if (!cancelled && generation.current === request) {
					console.error("[pdf-viewer] render failed", unknown);
					setError(t("options.renderError"));
				}
			}
		};

		queue.current = queue.current.then(run, run).finally(() => {
			if (!cancelled && generation.current === request) {
				setRendering(false);
			}
		});

		return () => {
			cancelled = true;
			pdfWorker()
				.then((worker) => worker.cancelRender())
				.catch(() => undefined);
		};
	}, [page, scale, pages, t, clearCanvas]);

	useEffect(() => {
		return () => {
			generation.current += 1;
			pdfWorker()
				.then((worker) => worker.closePdf())
				.catch(() => undefined);
		};
	}, []);

	const goToPage = (next: number) => {
		const clamped = Math.max(1, Math.min(pages, next));
		if (clamped === page) {
			return;
		}
		clearCanvas();
		setRenderedPage(null);
		setError(null);
		setPage(clamped);
	};

	const zoomTo = (next: number) => {
		const clamped = Math.max(0.5, Math.min(3, next));
		if (clamped === scale) {
			return;
		}
		clearCanvas();
		setRenderedPage(null);
		setError(null);
		setScale(clamped);
	};

	const open = async (files: File[]) => {
		const [picked] = files;
		if (!picked) {
			return;
		}
		resetViewer();
		setError(null);
		if (picked.size > MAX_PDF_BYTES) {
			setError(te("tooLarge", { limit: formatBytes(MAX_PDF_BYTES) }));
			return;
		}
		setFile(picked);
		setLoading(true);
		setPages(0);
		try {
			const worker = await pdfWorker();
			const result = await worker.openPdf(await picked.arrayBuffer());
			if (!result.ok) {
				console.error("[pdf-viewer] open failed", result.detail ?? result.code);
				setError(t("options.unreadable"));
				setFile(null);
				return;
			}
			setPages(result.value.pages);
			setPage(1);
			setScale(1.1);
		} catch (unknown) {
			console.error("[pdf-viewer] open failed", unknown);
			setError(t("options.unreadable"));
			setFile(null);
		} finally {
			setLoading(false);
		}
	};

	const close = () => {
		resetViewer();
		setFile(null);
		setPages(0);
		setPage(1);
		setError(null);
		pdfWorker()
			.then((worker) => worker.closePdf())
			.catch(() => undefined);
	};

	return (
		<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
			<div className="flex min-w-0 flex-col gap-4">
				{!file ? (
					<Dropzone
						accept="application/pdf,.pdf"
						browseLabel={tc("browse")}
						disabled={loading}
						hint={tc("dropHint")}
						onFiles={open}
					/>
				) : (
					<div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2">
						<p className="min-w-0 flex-1 truncate text-small text-text-2">
							{file.name}
						</p>
						<div className="flex items-center gap-2">
							<SmoothButton asChild size="sm" variant="secondary">
								<button onClick={close} type="button">
									{t("options.close")}
								</button>
							</SmoothButton>
						</div>
					</div>
				)}
				{error ? (
					<p
						className="text-small text-error"
						data-testid="pdf-viewer-error"
						role="alert"
					>
						{error}
					</p>
				) : null}
				{loading ? (
					<p className="text-small text-text-2">{t("options.loading")}</p>
				) : null}
				{file && pages > 0 ? (
					<div className="relative flex min-h-64 justify-center overflow-auto rounded-lg border border-border bg-surface-2 p-3">
						{rendering ? (
							<span className="absolute end-5 top-5 rounded-md bg-surface px-2 py-1 text-caption text-text-2">
								{t("options.rendering")}
							</span>
						) : null}
						<canvas
							aria-label={t("options.pageCanvas")}
							className="h-auto max-w-full rounded-sm bg-white shadow-modal"
							data-rendered-page={renderedPage ?? undefined}
							data-testid="pdf-page"
							ref={canvas}
						/>
					</div>
				) : null}
			</div>

			<div className="flex h-fit flex-col gap-4 rounded-lg border border-border bg-surface p-5 md:p-6">
				{file && pages > 0 ? (
					<>
						<Field>
							<FieldLabel htmlFor="pdf-page-number">
								{t("options.pageOf", { pages })}
							</FieldLabel>
							<FieldControl
								className={inputClass}
								id="pdf-page-number"
								inputMode="numeric"
								max={pages}
								min={1}
								onChange={(event) => {
									const next = Number(event.target.value);
									if (Number.isFinite(next)) {
										goToPage(next);
									}
								}}
								type="number"
								value={page}
							/>
						</Field>
						<div className="flex gap-2">
							<SmoothButton
								className="w-full"
								disabled={page <= 1 || rendering}
								onClick={() => goToPage(page - 1)}
								size="sm"
								variant="secondary"
							>
								<ChevronLeft aria-hidden="true" className="size-4" />
								{t("options.prev")}
							</SmoothButton>
							<SmoothButton
								className="w-full"
								disabled={page >= pages || rendering}
								onClick={() => goToPage(page + 1)}
								size="sm"
								variant="secondary"
							>
								{t("options.next")}
								<ChevronRight aria-hidden="true" className="size-4" />
							</SmoothButton>
						</div>
						<div className="flex items-center justify-between gap-2">
							<span className="text-small font-medium">
								{t("options.zoom")}
							</span>
							<div className="flex items-center gap-1">
								<button
									aria-label={t("options.zoomOut")}
									className="inline-flex size-9 cursor-pointer items-center justify-center rounded-md border border-border text-text outline-none hover:bg-surface-2"
									disabled={scale <= 0.5}
									onClick={() => zoomTo(scale - 0.2)}
									type="button"
								>
									<Minus aria-hidden="true" className="size-4" />
								</button>
								<output className="w-12 text-center text-small tabular-nums text-text-2">
									{Math.round(scale * 100)}%
								</output>
								<button
									aria-label={t("options.zoomIn")}
									className="inline-flex size-9 cursor-pointer items-center justify-center rounded-md border border-border text-text outline-none hover:bg-surface-2"
									disabled={scale >= 3}
									onClick={() => zoomTo(scale + 0.2)}
									type="button"
								>
									<Plus aria-hidden="true" className="size-4" />
								</button>
							</div>
						</div>
					</>
				) : (
					<p className="text-small text-text-2">{t("options.hint")}</p>
				)}
			</div>
		</div>
	);
}
