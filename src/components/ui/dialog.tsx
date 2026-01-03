import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

/**
 * DialogOverlay - Fullscreen backdrop with flexbox centering
 * 
 * ARCHITECTURE FIX (2026-01-03):
 * - Uses flexbox centering instead of transform-based centering
 * - This prevents the mobile keyboard + transform bug where content
 *   gets pushed off-screen when virtual keyboard appears
 * - The overlay itself is the centering container, not the content
 */
const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      // Fullscreen backdrop with flexbox centering for mobile
      "fixed inset-0 z-50 bg-black/80",
      // Flexbox centering - this is the KEY fix for mobile
      "flex items-center justify-center",
      // Safe area padding for notched devices
      "p-4 pb-[max(1rem,env(safe-area-inset-bottom))]",
      // Animations
      "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      // Allow scrolling if content is too tall
      "overflow-y-auto",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

/**
 * DialogContent - Mobile-first dialog container
 * 
 * ARCHITECTURE FIX (2026-01-03):
 * This is the 6th+ attempt to fix mobile dialog issues. Previous fixes failed
 * because they used transform-based centering (translate-y-[-50%]) which:
 * - Doesn't recalculate when virtual keyboard appears
 * - Positions relative to initial viewport, not visible viewport
 * - Conflicts with max-height constraints on iOS/Android
 * 
 * NEW APPROACH:
 * - DialogOverlay handles centering via flexbox (no transforms)
 * - DialogContent uses relative positioning within the flex container
 * - max-height uses dvh with vh fallback for keyboard safety
 * - overflow-hidden enables proper flex child constraint
 * 
 * Individual dialogs can override max-width for desktop via sm:max-w-* classes,
 * but mobile handling should NOT be overridden.
 */
const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay>
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          // MOBILE-FIRST: No transforms, no fixed positioning
          // The content is centered by the flex parent (DialogOverlay)
          "relative z-50",
          // Width: full width minus padding, capped at max-width
          "w-full max-w-[calc(100vw-2rem)] sm:max-w-lg",
          // Layout: flex column with overflow handling
          "flex flex-col overflow-hidden",
          // Spacing and appearance
          "gap-4 border bg-background p-4 sm:p-6 shadow-lg rounded-xl",
          // Max height: use dvh for keyboard safety, vh as fallback
          // Single value - no stacking that causes only second to apply
          "max-h-[min(calc(100vh-2rem),calc(100dvh-2rem))]",
          // Animations - fade and scale only, no slide transforms
          "duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close 
          className={cn(
            "absolute right-3 top-3 rounded-full",
            "opacity-70 ring-offset-background transition-opacity",
            "hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "disabled:pointer-events-none",
            // Touch target: 44x44px minimum for mobile accessibility
            "w-8 h-8 min-w-[44px] min-h-[44px]",
            "flex items-center justify-center touch-manipulation"
          )}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogOverlay>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div 
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      // Prevent header from shrinking
      "flex-shrink-0",
      className
    )} 
    {...props} 
  />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div 
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      // Prevent footer from shrinking
      "flex-shrink-0",
      className
    )} 
    {...props} 
  />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description 
    ref={ref} 
    className={cn("text-sm text-muted-foreground", className)} 
    {...props} 
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
