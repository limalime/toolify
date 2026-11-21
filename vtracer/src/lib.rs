use visioncortex::ColorImage;
use vtracer::{ColorMode, Config, convert};
use wasm_bindgen::prelude::*;

// traces raw rgba pixels into an svg string. the browser decodes the
// image first, so this crate only sees pixels, width, and height.
#[wasm_bindgen]
pub fn trace_rgba(
    pixels: &[u8],
    width: usize,
    height: usize,
    color_precision: i32,
    corner_threshold: i32,
    filter_speckle: usize,
) -> Result<String, JsValue> {
    if pixels.len() != width * height * 4 {
        return Err(JsValue::from_str("pixel buffer size mismatch"));
    }
    let img = ColorImage {
        pixels: pixels.to_vec(),
        width,
        height,
    };
    let config = Config {
        color_mode: ColorMode::Color,
        color_precision,
        corner_threshold,
        filter_speckle,
        ..Config::default()
    };
    convert(img, config)
        .map(|svg| svg.to_string())
        .map_err(JsValue::from)
}
