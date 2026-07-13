export type { Toast, ToastContextValue, ToastType } from "./toast"

export interface LogSummary {
  id: number
  host: string
  method: string
  url: string
  proto: string
  statusCode: number
  tls: boolean
}

export type Theme = "dark" | "light"
export type ViewMode = "pretty" | "raw"
export type PanelTab = "request" | "response"
