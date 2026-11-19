import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// locale aware wrappers around the Next.js navigation APIs
export const { Link, redirect, usePathname, useRouter, getPathname } =
	createNavigation(routing);
