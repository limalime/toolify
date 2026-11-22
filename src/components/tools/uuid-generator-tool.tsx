"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { notify } from "@/components/primitives/notify";
import Field, { FieldControl, FieldLabel } from "@/components/smoothui/field";
import Select from "@/components/smoothui/select";
import Slider from "@/components/smoothui/slider";
import SmoothButton from "@/components/smoothui/smooth-button";
import { inputClass, selectTriggerClass } from "@/lib/control-classes";
import {
	generateUuid,
	isUuid,
	UUID_VERSIONS,
	type UuidVersion,
} from "@/lib/others/uuid";
import { copyText } from "@/lib/text/clipboard";

export default function UuidGeneratorTool() {
	const t = useTranslations("tools.uuid-generator");
	const tc = useTranslations("common");
	const [version, setVersion] = useState<UuidVersion>("v7");
	const [namespace, setNamespace] = useState("");
	const [name, setName] = useState("");
	const [count, setCount] = useState(1);
	const [error, setError] = useState<string | null>(null);
	const [values, setValues] = useState<string[]>([]);

	const needsIdentity = version === "v3" || version === "v5";

	const generate = () => {
		setError(null);
		if (needsIdentity && !isUuid(namespace.trim())) {
			setError(t("options.namespaceInvalid"));
			return;
		}
		try {
			const next: string[] = [];
			const total = needsIdentity ? 1 : count;
			for (let index = 0; index < total; index++) {
				next.push(generateUuid(version, { namespace: namespace.trim(), name }));
			}
			setValues(next);
		} catch {
			setError(t("options.namespaceInvalid"));
		}
	};

	const copy = async (value: string) => {
		if (await copyText(value)) {
			notify.success(tc("copied"));
		} else {
			notify.error(tc("copy"), value.slice(0, 64));
		}
	};

	const copyAll = async () => {
		if (values.length === 0) {
			return;
		}
		await copy(values.join("\n"));
	};

	return (
		<div className="grid gap-6 lg:grid-cols-[1fr_320px]">
			<div className="order-2 flex min-w-0 flex-col gap-4 lg:order-1">
				{needsIdentity ? (
					<>
						<Field>
							<FieldLabel htmlFor="uuid-namespace">
								{t("options.namespace")}
							</FieldLabel>
							<FieldControl
								autoComplete="off"
								className={inputClass}
								id="uuid-namespace"
								onChange={(event) => setNamespace(event.target.value)}
								value={namespace}
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="uuid-name">{t("options.name")}</FieldLabel>
							<FieldControl
								autoComplete="off"
								className={inputClass}
								id="uuid-name"
								onChange={(event) => setName(event.target.value)}
								value={name}
							/>
						</Field>
					</>
				) : null}
				{error ? (
					<p className="text-small text-error" role="alert">
						{error}
					</p>
				) : null}
				{values.length === 0 ? (
					<p className="text-small text-text-2">{t("options.emptyHint")}</p>
				) : (
					<div className="flex flex-col gap-2">
						{values.map((value) => (
							<button
								className="cursor-pointer truncate rounded-lg border border-border bg-surface p-3 text-start font-mono text-small outline-none transition-colors hover:border-blue-500 focus-visible:border-blue-500"
								data-testid={`uuid-${value}`}
								key={value}
								onClick={() => copy(value)}
								type="button"
							>
								{value}
							</button>
						))}
						<SmoothButton onClick={copyAll} size="sm" variant="secondary">
							{t("options.copyAll")}
						</SmoothButton>
					</div>
				)}
			</div>
			<div className="order-1 flex h-fit flex-col gap-4 rounded-lg border border-border bg-surface p-5 md:p-6 lg:order-2">
				<Field>
					<FieldLabel htmlFor="uuid-version">{t("options.version")}</FieldLabel>
					<Select
						aria-label={t("options.version")}
						className={selectTriggerClass}
						id="uuid-version"
						onValueChange={(value) => {
							const next = value as UuidVersion;
							setVersion(next);
							if (next === "v3" || next === "v5") {
								setCount(1);
							}
						}}
						options={UUID_VERSIONS.map((item) => ({
							label: item,
							value: item,
						}))}
						value={version}
					/>
				</Field>
				<div className="flex flex-col gap-2">
					<div className="flex items-center justify-between gap-2">
						<span className="text-small font-medium" id="uuid-count-label">
							{t("options.count")}
						</span>
						<output
							aria-labelledby="uuid-count-label"
							className="font-display text-h3 tabular-nums"
						>
							{count}
						</output>
					</div>
					<Slider
						aria-label={t("options.count")}
						disabled={needsIdentity}
						max={100}
						min={1}
						onValueChange={setCount}
						value={count}
					/>
					{needsIdentity ? (
						<p className="text-small text-text-2">{t("options.oneAtATime")}</p>
					) : null}
				</div>
				<SmoothButton className="w-full" onClick={generate} size="lg">
					{t("options.generate")}
				</SmoothButton>
			</div>
		</div>
	);
}
