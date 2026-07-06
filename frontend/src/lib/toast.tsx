import type { ComponentChildren } from "preact"
import { createContext, h as jsx } from "preact"
import { useCallback, useContext, useRef, useState } from "preact/hooks"
import type { ToastType } from "../types"

export interface Toast {
  id: number
  type: ToastType
  message: string
  leaving?: boolean
}

interface ToastContextValue {
  addToast: (type: ToastType, message: string, duration?: number) => void
}

const ToastContext = createContext<ToastContextValue>({
  addToast: () => {},
})

let nextId = 1

export function ToastProvider({ children }: { children: ComponentChildren }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const removeToast = useCallback((id: number) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)),
    )
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 200)
  }, [])

  const addToast = useCallback(
    (type: ToastType, message: string, duration = 4000) => {
      const id = nextId++
      setToasts((prev) => [...prev, { id, type, message }])
      timers.current.set(
        id,
        setTimeout(() => removeToast(id), duration),
      )
    },
    [removeToast],
  )

  return jsx(
    ToastContext.Provider,
    { value: { addToast } },
    children,
    jsx(
      "div",
      {
        class:
          "fixed top-26 right-4 z-9999 flex flex-col gap-2 pointer-events-none",
      },
      toasts.map((toast) =>
        jsx(
          "div",
          {
            key: toast.id,
            class: `pointer-events-auto px-3 py-2 text-xs rounded shadow-lg max-w-xs ${
              toast.leaving ? "animate-fade-out" : "animate-fade-in"
            } ${
              toast.type === "error"
                ? "bg-destructive text-destructive-foreground"
                : toast.type === "success"
                  ? "bg-green text-green-foreground"
                  : "bg-muted text-foreground"
            }`,
          },
          jsx("span", { class: "flex-1 wrap-break-word" }, toast.message),
        ),
      ),
    ),
  )
}

export function useToast(): ToastContextValue {
  return useContext(ToastContext)
}
