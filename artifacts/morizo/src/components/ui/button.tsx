import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { motion, type MotionProps } from "framer-motion"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
           "bg-primary text-primary-foreground border border-primary-border",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm border-destructive-border",
        outline:
          " border [border-color:var(--button-outline)] shadow-xs active:shadow-none ",
        secondary:
          "border bg-secondary text-secondary-foreground border border-secondary-border ",
        ghost: "border border-transparent",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "min-h-9 px-4 py-2",
        sm: "min-h-8 rounded-md px-3 text-xs",
        lg: "min-h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const springTransition = {
  type: "spring" as const,
  stiffness: 400,
  damping: 17,
}

const MotionSlot = motion.create(Slot)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, disabled, ...props }, ref) => {
    const animProps: MotionProps = disabled
      ? {}
      : {
          whileHover: { scale: 1.02 },
          whileTap: { scale: 0.97 },
          transition: springTransition,
        }

    if (asChild) {
      return (
        <MotionSlot
          {...(animProps as Record<string, unknown>)}
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref as React.Ref<HTMLElement>}
          {...({ disabled, ...props } as Record<string, unknown>)}
        />
      )
    }

    // Destructure out the HTML drag handlers whose types conflict with Framer Motion's
    // onDrag signature. Button is not a drag source so these handlers are not supported
    // and would be silently ignored by Framer Motion anyway.
    const {
      onDrag: _onDrag,
      onDragEnd: _onDragEnd,
      onDragStart: _onDragStart,
      onDragEnter: _onDragEnter,
      onDragLeave: _onDragLeave,
      onDragOver: _onDragOver,
      onDragExit: _onDragExit,
      ...safeProps
    } = props

    return (
      <motion.button
        {...animProps}
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled}
        {...(safeProps as Record<string, unknown>)}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
