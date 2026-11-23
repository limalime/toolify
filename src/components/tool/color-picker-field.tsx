"use client";

import { useTranslations } from "next-intl";
import {
	ColorPicker,
	ColorPickerContent,
	ColorPickerInput,
	type ColorPickerLabels,
	ColorPickerSwatch,
	ColorPickerTrigger,
	formatColor,
} from "@/components/reui/color-picker";
import { cn } from "@/lib/utils";

type ColorPickerFieldProps = {
	id?: string;
	label: string;
	value: string;
	onChange: (value: string) => void;
	className?: string;
	disabled?: boolean;
	variant?: "input" | "swatch";
};

export default function ColorPickerField({
	id,
	label,
	value,
	onChange,
	className,
	disabled,
	variant = "input",
}: ColorPickerFieldProps) {
	const t = useTranslations("common.colorPicker");
	const labels: ColorPickerLabels = {
		placeholder: t("placeholder"),
		panelLabel: t("panelLabel"),
		openPicker: t("openPicker"),
		area: t("area"),
		hue: t("hue"),
		saturation: t("saturation"),
		brightness: t("brightness"),
		lightness: t("lightness"),
		chroma: t("chroma"),
		red: t("red"),
		green: t("green"),
		blue: t("blue"),
		alpha: t("alpha"),
		hex: t("hex"),
		format: t("format"),
		eyeDropper: t("eyeDropper"),
		copy: t("copy"),
		copied: t("copied"),
		clear: t("clear"),
		swatches: t("swatches"),
	};

	return (
		<ColorPicker
			aria-label={label}
			disabled={disabled}
			format="hex"
			i18n={{
				labels,
				functions: { getColorName: (color) => formatColor(color, "hex") },
			}}
			id={id}
			onValueChange={(next) => {
				if (next) {
					onChange(next);
				}
			}}
			value={value}
		>
			{variant === "input" ? (
				<ColorPickerInput className={className} />
			) : (
				<ColorPickerTrigger
					className={cn("h-11 w-14 justify-center p-1", className)}
				>
					<ColorPickerSwatch className="size-full rounded-md" />
				</ColorPickerTrigger>
			)}
			<ColorPickerContent />
		</ColorPicker>
	);
}
