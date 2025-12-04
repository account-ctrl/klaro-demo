import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  asChild?: boolean; // Add asChild to props interface
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, asChild, ...props }, ref) => { // Destructure asChild
    // If asChild is true, we should render a Slot. Since we're not using Slot here,
    // and this component renders a native textarea, we simply ensure asChild is not passed down.
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)

Textarea.displayName = "Textarea"

export { Textarea }