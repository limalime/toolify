import { AD_SLOTS, ADS_ENABLED, type AdSlotName } from "@/lib/ads";
import { cn } from "@/lib/utils";

// mount point for one reserved ad placement. while ads are off the
// element is hidden and takes no space, so no blank boxes appear. the
// placement keeps its name and size in the markup for the switch on.
export default function AdSlot({
	className,
	name,
}: {
	className?: string;
	name: AdSlotName;
}) {
	const slot = AD_SLOTS[name];
	return (
		<div
			aria-hidden={ADS_ENABLED ? undefined : true}
			className={cn(ADS_ENABLED && slot.className, className)}
			data-ad-format={slot.format}
			data-ad-slot={name}
			data-ad-state={ADS_ENABLED ? "active" : "reserved"}
			hidden={!ADS_ENABLED}
		/>
	);
}
