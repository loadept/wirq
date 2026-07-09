import type { ComponentChildren } from "preact"
import { createPortal } from "preact/compat"
import { twMerge } from "tailwind-merge"

interface ModalProps {
  title: string
  class?: string
  children: ComponentChildren
}

export const Modal = ({
  title,
  class: className = "",
  children,
}: ModalProps) => {
  return createPortal(
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in">
      <div
        class={twMerge(
          "w-full max-w-xl bg-card border border-border rounded shadow-lg",
          className,
        )}
      >
        <div class="px-4 py-3 border-b border-border">
          <h2 class="text-sm text-foreground tracking-wider">{title}</h2>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}
