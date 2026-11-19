"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

// useReducedMotion reads false on the server and true on a reduced-motion
// client, so branching DOM on it breaks hydration. render the animated
// tree until mounted, then sync to the real preference.
export function useMountedReducedMotion() {
	const prefersReduced = useReducedMotion();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	return mounted ? prefersReduced : false;
}
