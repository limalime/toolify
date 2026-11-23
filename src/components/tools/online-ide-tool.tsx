"use client";

import { Compartment } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";
import { placeholder } from "@codemirror/view";
import { basicSetup, EditorView } from "codemirror";
import { Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { notify } from "@/components/primitives/notify";
import Field, { FieldControl, FieldLabel } from "@/components/smoothui/field";
import Select from "@/components/smoothui/select";
import SmoothButton from "@/components/smoothui/smooth-button";
import { inputClass, selectTriggerClass } from "@/lib/control-classes";
import { downloadBytes } from "@/lib/images/download";
import { copyText } from "@/lib/text/clipboard";

type LanguageId =
	| "html"
	| "css"
	| "javascript"
	| "typescript"
	| "react"
	| "rust"
	| "java"
	| "cpp"
	| "python"
	| "json"
	| "markdown"
	| "sql"
	| "xml";

const LANGUAGE_BY_EXTENSION: Record<string, LanguageId> = {
	html: "html",
	htm: "html",
	css: "css",
	js: "javascript",
	mjs: "javascript",
	cjs: "javascript",
	ts: "typescript",
	tsx: "react",
	jsx: "react",
	rs: "rust",
	java: "java",
	cpp: "cpp",
	cc: "cpp",
	h: "cpp",
	py: "python",
	json: "json",
	md: "markdown",
	markdown: "markdown",
	sql: "sql",
	xml: "xml",
	svg: "xml",
};

const MAX_CODE_BYTES = 2 * 1024 * 1024;

const LANGUAGES: Array<{ id: LanguageId; label: string; extension: string }> = [
	{ id: "html", label: "HTML", extension: "html" },
	{ id: "css", label: "CSS", extension: "css" },
	{ id: "javascript", label: "JavaScript", extension: "js" },
	{ id: "typescript", label: "TypeScript", extension: "ts" },
	{ id: "react", label: "React", extension: "tsx" },
	{ id: "rust", label: "Rust", extension: "rs" },
	{ id: "java", label: "Java", extension: "java" },
	{ id: "cpp", label: "C++", extension: "cpp" },
	{ id: "python", label: "Python", extension: "py" },
	{ id: "json", label: "JSON", extension: "json" },
	{ id: "markdown", label: "Markdown", extension: "md" },
	{ id: "sql", label: "SQL", extension: "sql" },
	{ id: "xml", label: "XML", extension: "xml" },
];

async function languageSupport(id: LanguageId) {
	switch (id) {
		case "html":
			return (await import("@codemirror/lang-html")).html();
		case "css":
			return (await import("@codemirror/lang-css")).css();
		case "javascript":
			return (await import("@codemirror/lang-javascript")).javascript();
		case "typescript":
			return (await import("@codemirror/lang-javascript")).javascript({
				typescript: true,
			});
		case "react":
			return (await import("@codemirror/lang-javascript")).javascript({
				jsx: true,
				typescript: true,
			});
		case "rust":
			return (await import("@codemirror/lang-rust")).rust();
		case "java":
			return (await import("@codemirror/lang-java")).java();
		case "cpp":
			return (await import("@codemirror/lang-cpp")).cpp();
		case "python":
			return (await import("@codemirror/lang-python")).python();
		case "json":
			return (await import("@codemirror/lang-json")).json();
		case "markdown":
			return (await import("@codemirror/lang-markdown")).markdown();
		case "sql":
			return (await import("@codemirror/lang-sql")).sql();
		case "xml":
			return (await import("@codemirror/lang-xml")).xml();
	}
}

export default function OnlineIdeTool() {
	const t = useTranslations("tools.online-ide");
	const tc = useTranslations("common");
	const [language, setLanguage] = useState<LanguageId>("javascript");
	const [customName, setCustomName] = useState("");
	const [uploaded, setUploaded] = useState<string | null>(null);
	const [uploadError, setUploadError] = useState<string | null>(null);
	const mount = useRef<HTMLDivElement>(null);
	const fileInput = useRef<HTMLInputElement>(null);
	const view = useRef<EditorView | null>(null);
	const compartment = useRef(new Compartment());

	// t is stable per locale, the editor mounts once.
	// biome-ignore lint/correctness/useExhaustiveDependencies: mount once by design
	useEffect(() => {
		let live = true;
		let editor: EditorView | null = null;
		languageSupport("javascript").then((support) => {
			if (!live || !mount.current) {
				return;
			}
			editor = new EditorView({
				doc: "",
				extensions: [
					basicSetup,
					oneDark,
					compartment.current.of(support),
					placeholder(t("options.placeholder")),
					EditorView.theme({
						"&": { borderRadius: "0.5rem", fontSize: "14px" },
						".cm-content": { minHeight: "320px" },
						".cm-scroller": { overflow: "auto" },
					}),
				],
				parent: mount.current,
			});
			view.current = editor;
		});
		return () => {
			live = false;
			editor?.destroy();
			view.current = null;
		};
	}, []);

	useEffect(() => {
		let live = true;
		languageSupport(language).then((support) => {
			if (live && view.current) {
				view.current.dispatch({
					effects: compartment.current.reconfigure(support),
				});
			}
		});
		return () => {
			live = false;
		};
	}, [language]);

	const current = () => view.current?.state.doc.toString() ?? "";

	const loadFile = async (picked: File) => {
		setUploadError(null);
		if (picked.size > MAX_CODE_BYTES) {
			setUploadError(t("options.fileTooLarge"));
			return;
		}
		try {
			const text = await picked.text();
			const editor = view.current;
			if (editor) {
				editor.dispatch({
					changes: {
						from: 0,
						to: editor.state.doc.length,
						insert: text,
					},
				});
				editor.focus();
			}
			const extension = picked.name.split(".").pop()?.toLowerCase() ?? "";
			const detected = LANGUAGE_BY_EXTENSION[extension];
			if (detected) {
				setLanguage(detected);
			}
			setUploaded(picked.name);
			setCustomName(picked.name);
		} catch {
			setUploadError(t("options.unreadableFile"));
		}
	};

	const copy = async () => {
		const code = current();
		if (!code) {
			return;
		}
		if (await copyText(code)) {
			notify.success(tc("copied"));
		} else {
			notify.error(tc("copy"), code.slice(0, 120));
		}
	};

	const download = () => {
		const code = current();
		if (!code) {
			return;
		}
		const extension =
			LANGUAGES.find((item) => item.id === language)?.extension ?? "txt";
		const name = customName.trim() || `snippet.${extension}`;
		downloadBytes(
			new TextEncoder().encode(code).buffer as ArrayBuffer,
			"text/plain",
			name,
		);
	};

	return (
		<div className="grid gap-6 lg:grid-cols-[1fr_320px]">
			<div className="flex min-w-0 flex-col gap-4">
				<div
					className="overflow-hidden rounded-lg border border-border"
					data-testid="ide-editor"
					dir="ltr"
					ref={mount}
				/>
				<p className="text-small text-text-2">{t("options.noCompiler")}</p>
			</div>
			<div className="flex h-fit flex-col gap-4 rounded-lg border border-border bg-surface p-5 md:p-6">
				<div className="flex flex-col gap-2">
					<input
						accept=".html,.htm,.css,.js,.mjs,.cjs,.ts,.tsx,.jsx,.rs,.java,.cpp,.cc,.h,.py,.json,.md,.markdown,.sql,.xml,.svg,.txt"
						aria-label={t("options.upload")}
						className="sr-only"
						onChange={(event) => {
							const picked = event.target.files?.[0];
							if (picked) {
								loadFile(picked);
							}
							event.target.value = "";
						}}
						ref={fileInput}
						type="file"
					/>
					<SmoothButton
						onClick={() => fileInput.current?.click()}
						size="lg"
						variant="secondary"
					>
						<Upload aria-hidden="true" className="size-4" />
						{t("options.upload")}
					</SmoothButton>
					<p className="truncate text-small text-text-2">
						{uploaded ?? t("options.noFile")}
					</p>
					{uploadError ? (
						<p className="text-small text-error" role="alert">
							{uploadError}
						</p>
					) : null}
				</div>
				<Field>
					<FieldLabel htmlFor="ide-language">
						{t("options.language")}
					</FieldLabel>
					<Select
						aria-label={t("options.language")}
						className={selectTriggerClass}
						onValueChange={(value) => setLanguage(value as LanguageId)}
						options={LANGUAGES.map((item) => ({
							label: item.label,
							value: item.id,
						}))}
						value={language}
					/>
				</Field>
				<Field>
					<FieldLabel htmlFor="ide-filename">
						{t("options.filename")}
					</FieldLabel>
					<FieldControl
						autoComplete="off"
						className={inputClass}
						id="ide-filename"
						onChange={(event) => setCustomName(event.target.value)}
						placeholder={`snippet.${
							LANGUAGES.find((item) => item.id === language)?.extension ?? "txt"
						}`}
						spellCheck={false}
						value={customName}
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
