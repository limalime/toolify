"use client";

import { Toast as ToastPrimitive } from "@base-ui/react/toast";
import {
	ToastClose,
	ToastContent,
	ToastDescription,
	type ToasterProps,
	ToastIcon,
	ToastRoot,
	ToastTitle,
	ToastViewport,
	toastManager,
	useToastManager,
} from "@/components/smoothui/toast";
import { cn } from "@/lib/utils";

// colored edge per kind, the title keeps carrying the meaning
const KIND_EDGE: Record<string, string> = {
	default: "border-s-border",
	error: "border-s-error",
	info: "border-s-info",
	loading: "border-s-border",
	success: "border-s-success",
	warning: "border-s-warning",
};

function EdgedToastList() {
	const { toasts } = useToastManager();
	return toasts.map((item) => (
		<ToastRoot
			className={cn("border-s-4", KIND_EDGE[item.type ?? "default"])}
			key={item.id}
			toast={item}
		>
			<ToastContent>
				<ToastIcon type={item.type} />
				<div className="min-w-0 flex-1">
					<ToastTitle />
					<ToastDescription />
				</div>
				<ToastClose />
			</ToastContent>
		</ToastRoot>
	));
}

// mount once near the root. success toasts leave after 4 seconds,
// errors pass timeout 0 through notify and stay until dismissed.
export default function AppToaster({
	className,
	limit = 3,
	timeout = 4000,
}: ToasterProps) {
	return (
		<ToastPrimitive.Provider
			limit={limit}
			timeout={timeout}
			toastManager={toastManager}
		>
			<ToastPrimitive.Portal>
				<ToastViewport className={className}>
					<EdgedToastList />
				</ToastViewport>
			</ToastPrimitive.Portal>
		</ToastPrimitive.Provider>
	);
}
