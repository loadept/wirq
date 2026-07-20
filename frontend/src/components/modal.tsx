import type { ComponentChildren } from "preact"
import { createPortal } from "preact/compat"
import { useEffect } from "preact/hooks"
import { twMerge } from "tailwind-merge"

interface ModalProps {
  title: string
  class?: string
  children: ComponentChildren
  onClose?: () => void
}

export const Modal = ({
  title,
  class: className = "",
  children,
  onClose,
}: ModalProps) => {
  const titleId = `modal-title-${title.replace(/\s+/g, "-").toLowerCase()}`

  useEffect(() => {
    if (!onClose) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [onClose])

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in"
    >
      <div
        class={twMerge(
          "w-full max-w-xl bg-card border border-border rounded shadow-lg",
          className,
        )}
      >
        <div class="px-4 py-3 border-b border-border">
          <h2 id={titleId} class="text-xs text-foreground tracking-wider">
            {title}
          </h2>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}
