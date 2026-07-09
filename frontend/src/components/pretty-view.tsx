import type { RequestLog, ResponseLog } from "../types/index"
import { BodyViewer } from "./body-viewer"

interface MessageViewProps {
  data: RequestLog | ResponseLog
  type: "request" | "response"
}

function getContentType(headers: Record<string, string[]>): string {
  for (const [key, values] of Object.entries(headers)) {
    if (key.toLowerCase() === "content-type") {
      return values[0] ?? ""
    }
  }
  return ""
}

function HeadersTable({ headers }: { headers: Record<string, string[]> }) {
  const entries = Object.entries(headers)
  if (entries.length === 0) return null

  return (
    <div>
      <div class="text-xs uppercase tracking-wider text-muted-foreground mb-1">
        Headers
      </div>
      <div class="text-sm border border-border rounded overflow-hidden">
        {entries.map(([header, values]) =>
          values.map((value) => (
            <div class="grid grid-cols-[auto_1fr] gap-x-3 px-2 py-0.5 even:bg-muted/30">
              <span class="text-primary shrink-0 whitespace-nowrap">
                {header}:
              </span>
              <span class="text-foreground/80 break-all">{value}</span>
            </div>
          )),
        )}
      </div>
    </div>
  )
}

export function PrettyView({ data, type }: MessageViewProps) {
  if (type === "request") {
    const req = data as RequestLog
    return (
      <div class="space-y-3">
        <div class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <span class="text-xs uppercase tracking-wider text-muted-foreground">
            URL:
          </span>
          <span class="break-all text-foreground/90">{req.url}</span>
          <span class="text-xs uppercase tracking-wider text-muted-foreground">
            Method:
          </span>
          <span class="text-foreground/90">{req.method}</span>
          <span class="text-xs uppercase tracking-wider text-muted-foreground">
            Proto:
          </span>
          <span class="text-foreground/90">{req.proto}</span>
          <span class="text-xs uppercase tracking-wider text-muted-foreground">
            Host:
          </span>
          <span class="text-foreground/90">{req.host}</span>
          <span class="text-xs uppercase tracking-wider text-muted-foreground">
            TLS:
          </span>
          <span class="text-foreground/90">{req.tls ? "Yes" : "No"}</span>
        </div>
        <HeadersTable headers={req.headers} />
        <div>
          <div class="text-xs uppercase tracking-wider text-muted-foreground mb-1">
            Body
          </div>
          <BodyViewer
            body={req.body}
            isBase64={req.isBase64}
            contentType={getContentType(req.headers)}
          />
        </div>
      </div>
    )
  }

  const res = data as ResponseLog
  return (
    <div class="space-y-3">
      <div class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <span class="text-xs uppercase tracking-wider text-muted-foreground">
          Status:
        </span>
        <span class="text-foreground/90">{res.statusCode}</span>
        <span class="text-xs uppercase tracking-wider text-muted-foreground">
          Proto:
        </span>
        <span class="text-foreground/90">{res.proto}</span>
      </div>
      <HeadersTable headers={res.headers} />
      <div>
        <div class="text-xs uppercase tracking-wider text-muted-foreground mb-1">
          Body
        </div>
        <BodyViewer
          body={res.body}
          isBase64={res.isBase64}
          contentType={getContentType(res.headers)}
        />
      </div>
    </div>
  )
}
