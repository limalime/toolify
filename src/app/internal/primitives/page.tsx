import type { Metadata } from "next";
import PrimitivesDemo from "./demo";

export const metadata: Metadata = {
	title: "Primitives",
	robots: { index: false },
};

export default function PrimitivesPage() {
	return <PrimitivesDemo />;
}
