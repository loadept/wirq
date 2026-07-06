export interface Toast {
  id: number
  type: ToastType
  message: string
  leaving?: boolean
}

export type ToastType = "error" | "success" | "info"

export interface ToastContextValue {
  addToast: (type: ToastType, message: string, duration?: number) => void
}
