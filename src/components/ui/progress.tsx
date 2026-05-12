import * as React from "react";
import { Progress as BaseProgress } from "@base-ui-components/react/progress";
import { cn } from "@/lib/utils";

export const Progress = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof BaseProgress.Root>
>(({ className, value, ...props }, ref) => (
  <BaseProgress.Root
    ref={ref}
    value={value}
    className={cn(
      "relative h-2 w-full overflow-hidden rounded-full bg-secondary",
      className,
    )}
    {...props}
  >
    <BaseProgress.Track className="h-full w-full">
      <BaseProgress.Indicator className="h-full bg-primary transition-all" />
    </BaseProgress.Track>
  </BaseProgress.Root>
));
Progress.displayName = "Progress";
