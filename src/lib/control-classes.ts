// class overrides that pull installed components onto the Toolify spec.
// applied through className so tailwind-merge resolves conflicts.

export const inputClass =
	"h-11 border-border bg-surface-2 text-base md:text-base";

export const selectTriggerClass =
	"h-11 border-border bg-surface-2 text-base md:text-base";

export const checkboxClass =
	"border-border data-checked:border-blue-500 data-checked:bg-blue-500 data-checked:text-white data-indeterminate:border-blue-500 data-indeterminate:bg-blue-500 data-indeterminate:text-white";

export const radioClass = "border-border";

export const switchClass = "rounded-none";

export const tabActiveClass = "min-h-11 data-active:text-blue-500";

export const accordionClass = "divide-border border-border bg-surface";

export const skeletonClass = "bg-surface-2";

export const alertSuccessClass = "border-success/30 bg-success/10 text-success";

export const alertWarningClass = "border-warning/30 bg-warning/10 text-warning";

export const badgeFreeClass =
	"eyebrow border-transparent bg-blue-500/12 text-blue-500";

export const badgeNewClass =
	"eyebrow border-transparent bg-success/15 text-success";

export const badgeWarningClass =
	"eyebrow border-transparent bg-warning/15 text-warning";
