import { notFound } from "next/navigation";

// unknown routes inside a locale fall through to the localized 404 page.
export default function CatchAllPage() {
	notFound();
}
