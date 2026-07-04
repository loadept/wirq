import { Lock } from "lucide-preact"
import type { ProxyLog } from "../types/index"

interface RequestRowProps {
  event: ProxyLog
  selected: boolean
  onClick: () => void
}

const METHOD_COLORS: Record<string, string> = {
  GET: "text-green",
  POST: "text-primary",
  PUT: "text-blue",
  PATCH: "text-purple",
  DELETE: "text-destructive",
  HEAD: "text-cyan",
  OPTIONS: "text-muted-foreground",
}

const STATUS_COLORS: Record<string, string> = {
  "2": "text-green",
  "3": "text-blue",
  "4": "text-primary",
  "5": "text-destructive",
}

export function RequestRow({ event, selected, onClick }: RequestRowProps) {
  const { request, response } = event
  const methodColor = METHOD_COLORS[request.method] ?? "text-foreground"
  const statusFirst = String(response.statusCode)[0]
  const statusColor = STATUS_COLORS[statusFirst] ?? "text-foreground"

  let path = request.url
  try {
    const u = new URL(request.url)
    path = u.pathname + u.search
  } catch {}

  return (
    <button
      type="button"
      onClick={onClick}
      class={`flex items-center gap-2 px-3 py-1 w-full text-sm text-left border-b border-border transition-colors ${
        selected
          ? "bg-foreground/8 border-x-3 border-x-primary"
          : "hover:bg-muted/50 border-l border-l-transparent"
      } cursor-pointer focus-visible:ring-1 focus-visible:ring-ring`}
    >
      {request.tls ? (
        <Lock class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      ) : (
        <span class="h-3.5 w-3.5 shrink-0" />
      )}
      <span class={`shrink-0 w-14 ${methodColor}`}>{request.method}</span>
      <span class={`shrink-0 w-10 text-right tabular-nums ${statusColor}`}>
        {response.statusCode}
      </span>
      <span class="text-muted-foreground truncate max-w-45 shrink-0">
        {request.host}
      </span>
      <span class="truncate text-foreground/70">{path}</span>
    </button>
  )
}
