import * as React from "react";
import { Dialog as BaseDialog } from "@base-ui-components/react/dialog";
import { X } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const Sheet = BaseDialog.Root;
export const SheetTrigger = BaseDialog.Trigger;
export const SheetClose = BaseDialog.Close;
export const SheetPortal = BaseDialog.Portal;

const sheetVariants = cva(
  "fixed z-50 gap-4 bg-card p-4 sm:p-6 shadow-lg border outline-none overflow-y-auto data-[starting-style]:translate-x-0 transition-transform duration-200",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b max-h-[100dvh] data-[starting-style]:-translate-y-full data-[ending-style]:-translate-y-full",
        bottom:
          "inset-x-0 bottom-0 border-t max-h-[100dvh] data-[starting-style]:translate-y-full data-[ending-style]:translate-y-full",
        left: "inset-y-0 left-0 h-[100dvh] w-[85vw] max-w-xs border-r data-[starting-style]:-translate-x-full data-[ending-style]:-translate-x-full",
        right:
          "inset-y-0 right-0 h-[100dvh] w-[92vw] max-w-md border-l sm:max-w-sm data-[starting-style]:translate-x-full data-[ending-style]:translate-x-full",
      },
    },
    defaultVariants: { side: "right" },
  },
);

export interface SheetContentProps
  extends React.ComponentProps<typeof BaseDialog.Popup>,
    VariantProps<typeof sheetVariants> {}

export const SheetContent = React.forwardRef<HTMLDivElement, SheetContentProps>(
  ({ side, className, children, ...props }, ref) => (
    <SheetPortal>
      <BaseDialog.Backdrop className="fixed inset-0 z-50 bg-black/60 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 transition-opacity duration-200" />
      <BaseDialog.Popup
        ref={ref}
        className={cn(sheetVariants({ side }), className)}
        {...props}
      >
        {children}
        <BaseDialog.Close className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </BaseDialog.Close>
      </BaseDialog.Popup>
    </SheetPortal>
  ),
);
SheetContent.displayName = "SheetContent";

export function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col space-y-1.5", className)} {...props} />;
}

export const SheetTitle = React.forwardRef<
  HTMLHeadingElement,
  React.ComponentProps<typeof BaseDialog.Title>
>(({ className, ...props }, ref) => (
  <BaseDialog.Title
    ref={ref}
    className={cn("text-lg font-semibold tracking-tight", className)}
    {...props}
  />
));
SheetTitle.displayName = "SheetTitle";

export const SheetDescription = React.forwardRef<
  HTMLParagraphElement,
  React.ComponentProps<typeof BaseDialog.Description>
>(({ className, ...props }, ref) => (
  <BaseDialog.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
SheetDescription.displayName = "SheetDescription";
