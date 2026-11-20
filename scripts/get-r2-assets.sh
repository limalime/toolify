#!/usr/bin/env bash
# Downloads every large asset Toolify serves from R2 (background removal
# data, onnxruntime wasm, upscale model, ffmpeg cores) into a folder tree
# that mirrors the R2 key layout. Every file is size/hash verified.
# Usage: ./get-r2-assets.sh [output-dir]
set -euo pipefail
OUT="${1:-r2-upload}"
mkdir -p "$OUT/bg-removal/1.7.0" "$OUT/ort/1.21.0" "$OUT/upscale" \
  "$OUT/ffmpeg/0.12.10/st" "$OUT/ffmpeg/0.12.10/mt"

get() { # url, dest, want_bytes
  curl -sfL "$1" -o "$2"
  local got; got=$(wc -c <"$2")
  [ "$got" = "$3" ] || { echo "SIZE MISMATCH $2 want=$3 got=$got"; exit 1; }
  echo "ok ($got B) $2"
}

echo "== 1/4 background-removal data 1.7.0 (trimmed: small + medium models) =="
BASE="https://staticimgly.com/@imgly/background-removal-data/1.7.0/dist"
curl -sfL "$BASE/resources.json" -o /tmp/imgly-full.json
python3 -c "import json; m=json.load(open('/tmp/imgly-full.json')); del m['/models/isnet']; json.dump(m, open('$OUT/bg-removal/1.7.0/resources.json', 'w'))"
python3 - "$BASE" "$OUT/bg-removal/1.7.0" <<'EOF'
import json, subprocess, sys
base, dest = sys.argv[1], sys.argv[2]
m = json.load(open(dest + '/resources.json'))
seen = set()
for entry in m.values():
    for c in entry['chunks']:
        if c['name'] in seen:
            continue
        seen.add(c['name'])
        subprocess.run(['curl', '-sfL', base + '/' + c['name'], '-o', dest + '/' + c['name']], check=True)
        h = subprocess.run(['sha256sum', dest + '/' + c['name']], capture_output=True, text=True).stdout.split()[0]
        assert h == c['hash'] == c['name'], c['name']
print('imgly chunks ok:', len(seen))
EOF

echo "== 2/4 onnxruntime-web 1.21.0 wasm =="
ORT="https://unpkg.com/onnxruntime-web@1.21.0/dist"
get "$ORT/ort-wasm-simd-threaded.wasm" "$OUT/ort/1.21.0/ort-wasm-simd-threaded.wasm" 12666427
get "$ORT/ort-wasm-simd-threaded.mjs" "$OUT/ort/1.21.0/ort-wasm-simd-threaded.mjs" 26583
get "$ORT/ort-wasm-simd-threaded.jsep.wasm" "$OUT/ort/1.21.0/ort-wasm-simd-threaded.jsep.wasm" 23914392
get "$ORT/ort-wasm-simd-threaded.jsep.mjs" "$OUT/ort/1.21.0/ort-wasm-simd-threaded.jsep.mjs" 53602

echo "== 3/4 upscale model realesr-general-x4v3 =="
get "https://github.com/MohaElder/openenlarge/releases/download/upscaler-assets-v1/realesr-general-x4v3.onnx" \
  "$OUT/upscale/realesr-general-x4v3.onnx" 4871181
echo "09b757accd747d7e423c1d352b3e8f23e77cc5742d04bae958d4eb8082b76fa4  $OUT/upscale/realesr-general-x4v3.onnx" | sha256sum -c -

echo "== 4/4 ffmpeg 0.12.10 cores =="
ST="https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm"
MT="https://unpkg.com/@ffmpeg/core-mt@0.12.10/dist/esm"
get "$ST/ffmpeg-core.js" "$OUT/ffmpeg/0.12.10/st/ffmpeg-core.js" 111804
get "$ST/ffmpeg-core.wasm" "$OUT/ffmpeg/0.12.10/st/ffmpeg-core.wasm" 32232419
get "$MT/ffmpeg-core.js" "$OUT/ffmpeg/0.12.10/mt/ffmpeg-core.js" 128947
get "$MT/ffmpeg-core.worker.js" "$OUT/ffmpeg/0.12.10/mt/ffmpeg-core.worker.js" 2115
get "$MT/ffmpeg-core.wasm" "$OUT/ffmpeg/0.12.10/mt/ffmpeg-core.wasm" 32718323

echo "DONE. Upload the contents of $OUT/ to R2 preserving relative paths."
du -sh "$OUT"
