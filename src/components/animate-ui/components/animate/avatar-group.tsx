// From the @animate-ui registry (components-animate-avatar-group), restyled to the dashboard tokens.
// The primitive ships in @animate-ui/react, so it is imported from the package rather than vendored.
import * as React from "react";
import * as motion from "motion/react-client";

import {
  AvatarGroup as AvatarGroupPrimitive,
  AvatarGroupTooltip as AvatarGroupTooltipPrimitive,
  AvatarGroupTooltipArrow as AvatarGroupTooltipArrowPrimitive,
  type AvatarGroupProps as AvatarGroupPropsPrimitive,
  type AvatarGroupTooltipProps as AvatarGroupTooltipPropsPrimitive,
} from "@animate-ui/react/primitives/avatar-group";
import { cn } from "@/lib/utils";

type AvatarGroupProps = AvatarGroupPropsPrimitive;

function AvatarGroup({ className, invertOverlap = true, ...props }: AvatarGroupProps) {
  return <AvatarGroupPrimitive className={cn("-space-x-1.5", className)} invertOverlap={invertOverlap} {...props} />;
}

type AvatarGroupTooltipProps = Omit<AvatarGroupTooltipPropsPrimitive, "asChild"> & {
  children: React.ReactNode;
  layout?: boolean | "position" | "size" | "preserve-aspect";
};

function AvatarGroupTooltip({ className, children, layout = "preserve-aspect", ...props }: AvatarGroupTooltipProps) {
  return (
    <AvatarGroupTooltipPrimitive
      className={cn("z-50 w-fit rounded-md border border-line-strong bg-raised px-2.5 py-1.5 text-[13px] text-ink shadow-xl text-balance", className)}
      {...props}
    >
      <motion.div layout={layout} className="overflow-hidden">
        {children}
      </motion.div>
      <AvatarGroupTooltipArrowPrimitive
        className="size-3 fill-raised data-[side='bottom']:translate-y-[1px] data-[side='left']:translate-x-[-1px] data-[side='right']:translate-x-[1px] data-[side='top']:translate-y-[-1px]"
        tipRadius={2}
      />
    </AvatarGroupTooltipPrimitive>
  );
}

export { AvatarGroup, AvatarGroupTooltip, type AvatarGroupProps, type AvatarGroupTooltipProps };
