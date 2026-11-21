// onnxruntime-web 1.21 ships ambient types its exports map hides from
// module resolution, so redeclare the entry points here.
declare module "onnxruntime-web" {
	export * from "onnxruntime-common";
}

declare module "onnxruntime-web/webgpu" {
	export * from "onnxruntime-web";
}
