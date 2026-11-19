// non-localized requests the proxy never sees, such as dotted paths.
// plain english, rendered without any locale context or styles.
export default function GlobalNotFound() {
	return (
		<html lang="en">
			<body
				style={{
					background: "#0A0E14",
					color: "#F1F5F9",
					fontFamily: "system-ui, sans-serif",
				}}
			>
				<main
					style={{ margin: "4rem auto", maxWidth: "40rem", padding: "0 1rem" }}
				>
					<h1>Page not found</h1>
					<p>
						That address does not exist. <a href="/">Back to homepage</a>
					</p>
				</main>
			</body>
		</html>
	);
}
