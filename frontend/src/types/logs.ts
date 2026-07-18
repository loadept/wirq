export interface LogSummary {
  id: number
  host: string
  method: string
  url: string
  proto: string
  statusCode: number
  tls: boolean
}
