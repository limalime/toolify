import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const VIDEO_SLUGS = [
	"mp4-to-mp3",
	"video-to-gif",
	"video-converter",
	"compress-video",
	"crop-video",
];

const nextConfig: NextConfig = {
	async headers() {
		// isolation lives on video routes only. credentialless keeps fonts
		// and analytics loading while enabling threaded ffmpeg, and safari
		// simply ignores it and falls back to the single-thread core.
		const videoSources = VIDEO_SLUGS.flatMap((slug) => [
			`/${slug}`,
			`/:locale/${slug}`,
		]);
		return [
			{
				source: "/:path*",
				headers: [
					{ key: "Cross-Origin-Resource-Policy", value: "same-origin" },
				],
			},
			...videoSources.map((source) => ({
				source,
				headers: [
					{ key: "Cross-Origin-Opener-Policy", value: "same-origin" },
					{ key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
				],
			})),
		];
	},
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);

// Enable calling `getCloudflareContext()` in `next dev`.
// See https://opennext.js.org/cloudflare/bindings#local-access-to-bindings.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

initOpenNextCloudflareForDev();
