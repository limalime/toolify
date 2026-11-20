declare module "pdfjs-dist/build/pdf.mjs" {
	export interface PdfViewport {
		width: number;
		height: number;
	}
	export interface PdfPage {
		getViewport(options: { scale: number }): PdfViewport;
		render(options: {
			canvasContext:
				| CanvasRenderingContext2D
				| OffscreenCanvasRenderingContext2D;
			viewport: PdfViewport;
		}): { promise: Promise<void> };
	}
	export interface PdfLoadingTask {
		promise: Promise<{ getPage(index: number): Promise<PdfPage> }>;
		destroy(): Promise<void>;
	}
	export function getDocument(source: { data: Uint8Array }): PdfLoadingTask;
	export const GlobalWorkerOptions: { workerSrc: string };
}
