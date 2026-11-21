# toolify-vtracer

Rust to WASM tracing for the PNG to SVG tool. Rust is used for
vtracer ONLY, everything else in Toolify is JS libraries.

## Build

```bash
cargo install wasm-pack
wasm-pack build --target web --out-dir ../public/vtracer --out-name vtracer
```

The output (`vtracer.js` plus `vtracer_bg.wasm`) is committed to
`public/vtracer/` so production never rebuilds it. The image worker
loads the glue through a blob-URL import with an explicit wasm path,
outside the JS bundler entirely.

## API

`trace_rgba(pixels, width, height, color_precision, corner_threshold,
filter_speckle)` takes raw RGBA bytes and returns the SVG markup.
