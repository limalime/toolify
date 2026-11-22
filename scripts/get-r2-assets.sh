#!/usr/bin/env bash
# Downloads every large asset Toolify serves from R2 (background removal
# model, onnxruntime wasm, upscale model, ffmpeg cores and api) into a
# folder tree that mirrors the R2 key layout. Every file is size/hash
# verified. Run from the repo root after npm install.
# Usage: ./get-r2-assets.sh [output-dir]
set -euo pipefail
OUT="${1:-r2-upload}"
mkdir -p "$OUT/bg-removal/ormbg/1.0.0/onnx" "$OUT/ort/1.21.0" \
  "$OUT/ort/1.31.0" "$OUT/upscale" "$OUT/ffmpeg/0.12.10/st" \
  "$OUT/ffmpeg/0.12.10/mt" "$OUT/ffmpeg/0.12.15/esm"

get() { # url, dest, want_bytes
  curl -sfL "$1" -o "$2"
  local got; got=$(wc -c <"$2")
  [ "$got" = "$3" ] || { echo "SIZE MISMATCH $2 want=$3 got=$got"; exit 1; }
  echo "ok ($got B) $2"
}

echo "== 1/5 background removal ORMBG 1.0.0 (Apache-2.0) =="
HF="https://huggingface.co/onnx-community/ormbg-ONNX/resolve/main"
BG="$OUT/bg-removal/ormbg/1.0.0"
get "$HF/config.json" "$BG/config.json" 27
get "$HF/preprocessor_config.json" "$BG/preprocessor_config.json" 283
get "$HF/onnx/model_fp16.onnx" "$BG/onnx/model_fp16.onnx" 88117930
sha256sum -c <<EOF
d0b94ab052ace79177085c66a00a3f014a973edb09999cb0108bb01e65ded060  $BG/config.json
ed502c6ea29c5fb8aafdafdc5bcf1657dfca09888ff753e5c358672ebcfd448d  $BG/preprocessor_config.json
06e4236d2c2fae771f56b6e4723b6ed870a554b661ea4da4a74f650bbd53cf57  $BG/onnx/model_fp16.onnx
EOF

echo "== 2/5 onnxruntime-web 1.21.0 wasm =="
ORT="https://unpkg.com/onnxruntime-web@1.21.0/dist"
get "$ORT/ort-wasm-simd-threaded.wasm" "$OUT/ort/1.21.0/ort-wasm-simd-threaded.wasm" 12666427
get "$ORT/ort-wasm-simd-threaded.mjs" "$OUT/ort/1.21.0/ort-wasm-simd-threaded.mjs" 26583
get "$ORT/ort-wasm-simd-threaded.jsep.wasm" "$OUT/ort/1.21.0/ort-wasm-simd-threaded.jsep.wasm" 23914392
get "$ORT/ort-wasm-simd-threaded.jsep.mjs" "$OUT/ort/1.21.0/ort-wasm-simd-threaded.jsep.mjs" 53602

echo "== 2b/5 ORT 1.31.0 wasm, the build inside transformers =="
# the transformers package ships its own onnxruntime-web, find it by walking
# up from the resolved entry point instead of guessing node_modules nesting.
TRANSFORMERS_DIR="$(node -e 'let p=require("path"),f=require("fs"); let d=p.dirname(require.resolve("@huggingface/transformers")); while(!f.existsSync(p.join(d,"package.json"))) d=p.dirname(d); process.stdout.write(d)')"
ORT_131="$TRANSFORMERS_DIR/node_modules/onnxruntime-web/dist"
for f in ort-wasm-simd-threaded.asyncify.mjs ort-wasm-simd-threaded.asyncify.wasm; do
  cp "$ORT_131/$f" "$OUT/ort/1.31.0/$f"
  echo "ok $OUT/ort/1.31.0/$f"
done
sha256sum -c <<EOF
0966b6105cd936744498aa60df7a22cbd47af3374dbc64a9ab561c08a71e3611  $OUT/ort/1.31.0/ort-wasm-simd-threaded.asyncify.mjs
49871f5a4409519797e127440868a6d1923339d9185907f301a5b2a1d90af082  $OUT/ort/1.31.0/ort-wasm-simd-threaded.asyncify.wasm
EOF

echo "== 3/5 upscale model realesr-general-x4v3 =="
get "https://github.com/MohaElder/openenlarge/releases/download/upscaler-assets-v1/realesr-general-x4v3.onnx" \
  "$OUT/upscale/realesr-general-x4v3.onnx" 4871181
echo "09b757accd747d7e423c1d352b3e8f23e77cc5742d04bae958d4eb8082b76fa4  $OUT/upscale/realesr-general-x4v3.onnx" | sha256sum -c -

echo "== 4/5 ffmpeg 0.12.10 cores =="
ST="https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm"
MT="https://unpkg.com/@ffmpeg/core-mt@0.12.10/dist/esm"
get "$ST/ffmpeg-core.js" "$OUT/ffmpeg/0.12.10/st/ffmpeg-core.js" 111804
get "$ST/ffmpeg-core.wasm" "$OUT/ffmpeg/0.12.10/st/ffmpeg-core.wasm" 32232419
get "$MT/ffmpeg-core.js" "$OUT/ffmpeg/0.12.10/mt/ffmpeg-core.js" 128947
get "$MT/ffmpeg-core.worker.js" "$OUT/ffmpeg/0.12.10/mt/ffmpeg-core.worker.js" 2115
get "$MT/ffmpeg-core.wasm" "$OUT/ffmpeg/0.12.10/mt/ffmpeg-core.wasm" 32718323

echo "== 5/5 ffmpeg 0.12.15 api (from node_modules, version pinned) =="
for f in index.js classes.js const.js errors.js types.js utils.js worker.js; do
  cp "node_modules/@ffmpeg/ffmpeg/dist/esm/$f" "$OUT/ffmpeg/0.12.15/esm/$f"
  echo "ok $OUT/ffmpeg/0.12.15/esm/$f"
done
npx -y esbuild@0.25.1 node_modules/@ffmpeg/ffmpeg/dist/esm/worker.js --bundle --format=esm --target=es2020 --outfile="$OUT/ffmpeg/0.12.15/class-worker.js"
echo "ok $OUT/ffmpeg/0.12.15/class-worker.js"

echo "DONE. Upload the contents of $OUT/ to R2 preserving relative paths."
du -sh "$OUT"
