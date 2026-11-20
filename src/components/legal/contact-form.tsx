"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import Alert from "@/components/smoothui/alert";
import Field, { FieldControl, FieldLabel } from "@/components/smoothui/field";
import SmoothButton from "@/components/smoothui/smooth-button";
import Textarea from "@/components/smoothui/textarea";
import { alertDestructiveClass, inputClass } from "@/lib/control-classes";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Status =
	| { kind: "idle" }
	| { kind: "sending" }
	| { kind: "success" }
	| { kind: "error"; message: string };

export default function ContactForm() {
	const t = useTranslations("contact");
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [message, setMessage] = useState("");
	const [fieldError, setFieldError] = useState<string | null>(null);
	const [status, setStatus] = useState<Status>({ kind: "idle" });

	const submit = async (event: React.FormEvent) => {
		event.preventDefault();
		const trimmed = {
			name: name.trim(),
			email: email.trim(),
			message: message.trim(),
		};
		if (!trimmed.name || !trimmed.email || !trimmed.message) {
			setFieldError(t("errorRequired"));
			return;
		}
		if (!EMAIL_PATTERN.test(trimmed.email)) {
			setFieldError(t("errorEmail"));
			return;
		}
		setFieldError(null);
		setStatus({ kind: "sending" });
		try {
			const response = await fetch("/api/contact", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(trimmed),
			});
			const result = (await response.json().catch(() => null)) as {
				ok?: boolean;
				error?: string;
			} | null;
			if (response.ok && result?.ok) {
				setStatus({ kind: "success" });
				setName("");
				setEmail("");
				setMessage("");
			} else if (result?.error === "unavailable") {
				setStatus({ kind: "error", message: t("errorUnavailable") });
			} else {
				setStatus({ kind: "error", message: t("errorUpstream") });
			}
		} catch {
			setStatus({ kind: "error", message: t("errorUpstream") });
		}
	};

	if (status.kind === "success") {
		return (
			<Alert title={t("successTitle")} variant="success">
				{t("successLine")}
			</Alert>
		);
	}

	return (
		<form className="flex flex-col gap-4" noValidate onSubmit={submit}>
			<Field>
				<FieldLabel htmlFor="contact-name">{t("name")}</FieldLabel>
				<FieldControl
					className={inputClass}
					id="contact-name"
					placeholder={t("namePlaceholder")}
					autoComplete="name"
					value={name}
					onChange={(event) => setName(event.target.value)}
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor="contact-email">{t("email")}</FieldLabel>
				<FieldControl
					className={inputClass}
					id="contact-email"
					placeholder={t("emailPlaceholder")}
					autoComplete="email"
					type="email"
					value={email}
					onChange={(event) => setEmail(event.target.value)}
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor="contact-message">{t("message")}</FieldLabel>
				<Textarea
					aria-label={t("message")}
					className="border-border bg-surface-2 text-base md:text-base"
					id="contact-message"
					placeholder={t("messagePlaceholder")}
					rows={6}
					value={message}
					onChange={(event) => setMessage(event.target.value)}
				/>
			</Field>
			{fieldError ? (
				<p className="text-small text-error" role="alert">
					{fieldError}
				</p>
			) : null}
			{status.kind === "error" ? (
				<Alert
					className={alertDestructiveClass}
					title={status.message}
					variant="destructive"
				/>
			) : null}
			<div>
				<SmoothButton
					size="lg"
					loading={status.kind === "sending"}
					type="submit"
					className="w-full sm:w-auto"
				>
					{status.kind === "sending" ? t("sending") : t("send")}
				</SmoothButton>
			</div>
		</form>
	);
}
