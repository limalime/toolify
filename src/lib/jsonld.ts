import { SITE_NAME, SITE_URL } from "./site";

export interface FaqEntry {
	question: string;
	answer: string;
}

// serialize for a script tag. escaping < keeps a literal </script> inside
// an answer from breaking out of the block.
export function toJsonLd(data: unknown): string {
	return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function websiteJsonLd({
	description,
	locale,
}: {
	description: string;
	locale: string;
}) {
	return {
		"@context": "https://schema.org",
		"@type": "WebSite",
		name: SITE_NAME,
		url: `${SITE_URL}/`,
		description,
		inLanguage: locale,
	};
}

export function organizationJsonLd() {
	return {
		"@context": "https://schema.org",
		"@type": "Organization",
		name: SITE_NAME,
		url: `${SITE_URL}/`,
		logo: `${SITE_URL}/assets/logo-blue-square-1080.png`,
	};
}

export function webApplicationJsonLd({
	name,
	description,
	url,
	category,
}: {
	name: string;
	description: string;
	url: string;
	category: string;
}) {
	return {
		"@context": "https://schema.org",
		"@type": "WebApplication",
		name,
		url,
		description,
		applicationCategory: category,
		operatingSystem: "Web",
		browserRequirements: "Requires JavaScript",
		offers: {
			"@type": "Offer",
			price: "0",
			priceCurrency: "USD",
		},
	};
}

export function faqPageJsonLd(faqs: FaqEntry[]) {
	return {
		"@context": "https://schema.org",
		"@type": "FAQPage",
		mainEntity: faqs.map((faq) => ({
			"@type": "Question",
			name: faq.question,
			acceptedAnswer: {
				"@type": "Answer",
				text: faq.answer,
			},
		})),
	};
}
