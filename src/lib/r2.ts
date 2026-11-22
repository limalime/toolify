// central R2 locations for every large asset. versioned paths, immutable.
export const R2_BASE = "https://bucket.toolify.bond";

// model folders, resolved by transformers.js as {base}{id}/{file}
export const BG_REMOVAL_BASE = `${R2_BASE}/bg-removal/`;

export const ORT_WASM_BASE = `${R2_BASE}/ort/1.21.0/`;

// must match the onnxruntime-web build inside @huggingface/transformers
export const ORT_WASM_1_31_BASE = `${R2_BASE}/ort/1.31.0/`;

export const UPSCALE_MODEL_URL = `${R2_BASE}/upscale/realesr-general-x4v3.onnx`;

export const FFMPEG_ST_BASE = `${R2_BASE}/ffmpeg/0.12.10/st`;
export const FFMPEG_MT_BASE = `${R2_BASE}/ffmpeg/0.12.10/mt`;
export const FFMPEG_ESM_BASE = `${R2_BASE}/ffmpeg/0.12.15/esm`;
export const FFMPEG_CLASS_WORKER_URL = `${R2_BASE}/ffmpeg/0.12.15/class-worker.js`;
export const FFMPEG_WORKER_IMPL_URL = `${R2_BASE}/ffmpeg/0.12.15/worker-impl.js`;
