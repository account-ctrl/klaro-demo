"use client"

import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { AlertCircle, CheckCircle2, AlertTriangle, Info } from "lucide-react"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        return (
          <Toast key={id} variant={variant} {...props}>
            <div className="grid gap-1 w-full">
              {title && (
                <ToastTitle className="flex items-center gap-2">
                   {variant === 'destructive' && <AlertCircle className="h-4 w-4 text-red-500" />}
                   {variant === 'success' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                   {variant === 'warning' && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                   {(!variant || variant === 'default') && <Info className="h-4 w-4 text-blue-500" />}
                   {title}
                </ToastTitle>
              )}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
