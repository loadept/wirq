import { BrushCleaning } from "lucide-preact"
import { useEffect, useRef } from "preact/hooks"
import type { ProxyLog } from "../types/index"
import { RequestRow } from "./request-row"

interface RequestListProps {
  connected: boolean
  logs: ProxyLog[]
  selectedIndex: number | null
  onSelect: (index: number) => void
  onClear: () => void
}

export function RequestList({
  connected,
  logs,
  selectedIndex,
  onSelect,
  onClear,
}: RequestListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const autoScroll = useRef(true)

  useEffect(() => {
    if (autoScroll.current && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [logs.length])

  const handleScroll = () => {
    const el = containerRef.current
    if (!el) return
    const threshold = 40
    const atBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < threshold
    autoScroll.current = atBottom
  }

  return (
    <div class="flex flex-col flex-1 min-h-0">
      <div class="flex items-center justify-between px-3 py-1.5 border-b border-border bg-card shrink-0">
        <span class="text-xs uppercase text-foreground">
          Requests: {logs.length}
        </span>
        <button
          type="button"
          onClick={onClear}
          class="flex items-center gap-1 px-3 py-1.5 border border-border rounded text-xs text-foreground hover:bg-muted transition-colors cursor-pointer"
        >
          <BrushCleaning class="h-3 w-3" />
          Clear
        </button>
      </div>

      {!connected ? (
        <div class="flex-1 flex items-center justify-center bg-background">
          <span class="text-xs text-center text-muted-foreground">
            Proxy is not running
          </span>
        </div>
      ) : logs.length === 0 ? (
        <div class="flex-1 flex items-center justify-center bg-background">
          <span class="text-xs text-center text-muted-foreground animate-pulse">
            Waiting for requests...
          </span>
        </div>
      ) : (
        <div
          ref={containerRef}
          onScroll={handleScroll}
          class="flex-1 overflow-y-auto overflow-x-hidden bg-background"
        >
          {logs.map((event, i) => (
            <RequestRow
              key={i}
              event={event}
              selected={selectedIndex === i}
              onClick={() => onSelect(i)}
            />
          ))}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  )
}
