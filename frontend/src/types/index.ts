export interface RequestLog {
  host: string
  method: string
  url: string
  proto: string
  headers: Record<string, string[]>
  tls: boolean
  body: unknown
  is_base64: boolean
}

export interface ResponseLog {
  proto: string
  statusCode: number
  headers: Record<string, string[]>
  body: unknown
  isBase64: boolean
}

export interface ProxyLog {
  request: RequestLog
  response: ResponseLog
}

export type Theme = 'dark' | 'light'
export type ViewMode = 'pretty' | 'raw'
export type PanelTab = 'request' | 'response'
export type ToastType = 'error' | 'success' | 'info'
