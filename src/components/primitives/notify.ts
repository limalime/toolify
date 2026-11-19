import { toast } from "@/components/smoothui/toast";

// one place for toast timing: success leaves fast, warnings linger,
// errors stay until the user dismisses them.
export const notify = {
	success: (title: string, description?: string) =>
		toast.success(title, { description, timeout: 4000 }),
	warning: (title: string, description?: string) =>
		toast.warning(title, { description, timeout: 6000 }),
	error: (title: string, description?: string) =>
		toast.error(title, { description, timeout: 0 }),
	info: (title: string, description?: string) =>
		toast.info(title, { description, timeout: 4000 }),
};
