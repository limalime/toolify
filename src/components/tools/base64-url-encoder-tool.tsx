"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { notify } from "@/components/primitives/notify";
import Field, { FieldLabel } from "@/components/smoothui/field";
import SmoothButton from "@/components/smoothui/smooth-button";
import {
	TabsIndicator,
	TabsList,
	TabsRoot,
	TabsTab,
} from "@/components/smoothui/tabs";
import Textarea from "@/components/smoothui/textarea";
import { tabActiveClass } from "@/lib/control-classes";
import { copyText } from "@/lib/text/clipboard";
import {
	base64Decode,
	base64Encode,
	urlDecode,
	urlEncode,
} from "@/lib/text/codec";

export default function Base64UrlEncoderTool() {
	const t = useTranslations("tools.base64-url-encoder");
	const tc = useTranslations("common");
	const [format, setFormat] = useState("base64");
	const [direction, setDirection] = useState("encode");
	const [input, setInput] = useState("");

	const output = useMemo(() => {
		if (!input) {
			return { ok: true as const, value: "" };
		}
		try {
			if (format === "base64") {
				return {
					ok: true as const,
					value:
						direction === "encode" ? base64Encode(input) : base64Decode(input),
				};
			}
			return {
				ok: true as const,
				value: direction === "encode" ? urlEncode(input) : urlDecode(input),
			};
		} catch {
			return { ok: false as const, value: "" };
		}
	}, [input, format, direction]);

	const copy = async () => {
		if (!output.ok || !output.value) {
			notify.warning(!input ? t("options.needText") : t("options.invalid"));
			return;
		}
		if (await copyText(output.value)) {
			notify.success(tc("copied"));
		} else {
			notify.error(tc("copy"), output.value.slice(0, 120));
		}
	};

	return (
		<div className="grid gap-6 lg:grid-cols-[1fr_320px]">
			<div className="flex min-w-0 flex-col gap-4">
				<Field>
					<FieldLabel htmlFor="codec-input">{t("options.input")}</FieldLabel>
					<Textarea
						className="border-border bg-surface-2 font-mono"
						id="codec-input"
						onChange={(event) => setInput(event.target.value)}
						rows={5}
						value={input}
					/>
				</Field>
				{!output.ok ? (
					<p className="text-small text-error" role="alert">
						{t("options.invalid")}
					</p>
				) : null}
				{output.ok && output.value ? (
					<div className="flex flex-col gap-3 border border-border bg-surface p-5">
						<figure className="flex flex-col gap-3">
							<figcaption
								className="text-small font-medium"
								id="codec-output-label"
							>
								{t("options.output")}
							</figcaption>
							<pre
								className="overflow-x-auto font-mono text-small break-all whitespace-pre-wrap"
								data-testid="codec-output"
							>
								{output.value}
							</pre>
						</figure>
						<SmoothButton onClick={copy} size="sm" variant="secondary">
							{tc("copy")}
						</SmoothButton>
					</div>
				) : null}
			</div>
			<div className="flex h-fit flex-col gap-4 rounded-lg border border-border bg-surface p-5 md:p-6">
				<div className="flex flex-col gap-2">
					<span className="text-small font-medium" id="codec-format-label">
						{t("options.format")}
					</span>
					<TabsRoot defaultValue="base64" onValueChange={setFormat}>
						<TabsList aria-labelledby="codec-format-label">
							<TabsTab className={tabActiveClass} value="base64">
								{t("options.formatBase64")}
							</TabsTab>
							<TabsTab className={tabActiveClass} value="url">
								{t("options.formatUrl")}
							</TabsTab>
							<TabsIndicator />
						</TabsList>
					</TabsRoot>
				</div>
				<div className="flex flex-col gap-2">
					<span className="text-small font-medium" id="codec-direction-label">
						{t("options.direction")}
					</span>
					<TabsRoot defaultValue="encode" onValueChange={setDirection}>
						<TabsList aria-labelledby="codec-direction-label">
							<TabsTab className={tabActiveClass} value="encode">
								{t("options.encode")}
							</TabsTab>
							<TabsTab className={tabActiveClass} value="decode">
								{t("options.decode")}
							</TabsTab>
							<TabsIndicator />
						</TabsList>
					</TabsRoot>
				</div>
			</div>
		</div>
	);
}
