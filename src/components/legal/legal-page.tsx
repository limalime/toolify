export default function LegalPage({
	h1,
	lead,
	children,
}: {
	h1: string;
	lead: string;
	children: React.ReactNode;
}) {
	return (
		<div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-16">
			<div className="flex flex-col gap-3">
				<h1>{h1}</h1>
				<p className="text-body text-text-2">{lead}</p>
			</div>
			{children}
		</div>
	);
}

export function LegalSection({ h, body }: { h: string; body: string[] }) {
	return (
		<section className="flex flex-col gap-3">
			<h2>{h}</h2>
			{body.map((paragraph) => (
				<p className="text-body text-text-2" key={paragraph.slice(0, 24)}>
					{paragraph}
				</p>
			))}
		</section>
	);
}
