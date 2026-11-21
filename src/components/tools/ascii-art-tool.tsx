"use client";

import figlet from "figlet";
import ThreeD from "figlet/importable-fonts/3-D.js";
import Banner from "figlet/importable-fonts/Banner.js";
import Big from "figlet/importable-fonts/Big.js";
import Cybermedium from "figlet/importable-fonts/Cybermedium.js";
import Doom from "figlet/importable-fonts/Doom.js";
import Ghost from "figlet/importable-fonts/Ghost.js";
import Lean from "figlet/importable-fonts/Lean.js";
import Mini from "figlet/importable-fonts/Mini.js";
import Script from "figlet/importable-fonts/Script.js";
import Slant from "figlet/importable-fonts/Slant.js";
import Small from "figlet/importable-fonts/Small.js";
import Speed from "figlet/importable-fonts/Speed.js";
import Standard from "figlet/importable-fonts/Standard.js";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { notify } from "@/components/primitives/notify";
import Field, { FieldControl, FieldLabel } from "@/components/smoothui/field";
import Select from "@/components/smoothui/select";
import SmoothButton from "@/components/smoothui/smooth-button";
import { inputClass, selectTriggerClass } from "@/lib/control-classes";
import { downloadBytes } from "@/lib/images/download";
import { copyText } from "@/lib/text/clipboard";

const FONTS: Array<{ name: string; data: string }> = [
	{ name: "Standard", data: Standard },
	{ name: "Slant", data: Slant },
	{ name: "Small", data: Small },
	{ name: "Big", data: Big },
	{ name: "Banner", data: Banner },
	{ name: "Doom", data: Doom },
	{ name: "Lean", data: Lean },
	{ name: "Mini", data: Mini },
	{ name: "Script", data: Script },
	{ name: "Speed", data: Speed },
	{ name: "Ghost", data: Ghost },
	{ name: "Cybermedium", data: Cybermedium },
	{ name: "3-D", data: ThreeD },
];

export default function AsciiArtTool() {
	const t = useTranslations("tools.ascii-art");
	const tc = useTranslations("common");
	const [text, setText] = useState("");
	const [font, setFont] = useState("Standard");

	const art = useMemo(() => {
		if (!text.trim()) {
			return "";
		}
		const entry = FONTS.find((item) => item.name === font);
		if (entry) {
			figlet.parseFont(entry.name, entry.data);
		}
		try {
			return figlet.textSync(text.slice(0, 60), { font });
		} catch {
			return "";
		}
	}, [text, font]);

	const copy = async () => {
		if (!art) {
			notify.warning(t("options.needText"));
			return;
		}
		if (await copyText(art)) {
			notify.success(tc("copied"));
		} else {
			notify.error(tc("copy"), art.slice(0, 120));
		}
	};

	const download = () => {
		if (!art) {
			notify.warning(t("options.needText"));
			return;
		}
		downloadBytes(
			new TextEncoder().encode(art).buffer as ArrayBuffer,
			"text/plain",
			"ascii-art.txt",
		);
	};

	return (
		<div className="grid gap-6 lg:grid-cols-[1fr_320px]">
			<div className="flex min-w-0 flex-col gap-4">
				<Field>
					<FieldLabel htmlFor="ascii-text">{t("options.text")}</FieldLabel>
					<FieldControl
						autoComplete="off"
						className={inputClass}
						id="ascii-text"
						maxLength={60}
						onChange={(event) => setText(event.target.value)}
						value={text}
					/>
				</Field>
				{art ? (
					<pre
						className="overflow-x-auto rounded-lg border border-border bg-surface p-5 font-mono text-small leading-snug"
						data-testid="ascii-preview"
					>
						{art}
					</pre>
				) : null}
			</div>
			<div className="flex h-fit flex-col gap-4 rounded-lg border border-border bg-surface p-5 md:p-6">
				<Field>
					<FieldLabel htmlFor="ascii-font">{t("options.font")}</FieldLabel>
					<Select
						aria-label={t("options.font")}
						className={selectTriggerClass}
						onValueChange={setFont}
						options={FONTS.map((item) => ({
							label: item.name,
							value: item.name,
						}))}
						value={font}
					/>
				</Field>
				<div className="flex gap-2">
					<SmoothButton
						className="w-full"
						onClick={copy}
						size="lg"
						variant="secondary"
					>
						{tc("copy")}
					</SmoothButton>
					<SmoothButton className="w-full" onClick={download} size="lg">
						{tc("download")}
					</SmoothButton>
				</div>
			</div>
		</div>
	);
}
