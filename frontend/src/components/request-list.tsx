import { ClearLogs, ExportLogs } from "@wailsapp/app"
import { BrushCleaning, Download, Search } from "lucide-preact"
import { useEffect, useMemo, useRef, useState } from "preact/hooks"
import { useLogList } from "../lib/hooks"
import { useToast } from "../lib/providers/toast"
import { matchFilter } from "../lib/utils/filter"
import { FilterModal } from "./filter-modal"
import { RequestRow } from "./request-row"

interface RequestListProps {
  connected: boolean
  selectedId: number | null
  onSelectId: (index: number | null) => void
}

export function RequestList({
  connected,
  selectedId,
  onSelectId,
}: RequestListProps) {
  const { logs, setLogs } = useLogList(connected)
  const [filterText, setFilterText] = useState("")
  const [showFilter, setShowFilter] = useState(false)

  const toast = useToast()

  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const autoScroll = useRef(true)

  const filteredLogs = useMemo(() => {
    if (!filterText.trim()) {
      return logs
    }
    return logs.filter((log) => matchFilter(log, filterText))
  }, [logs, filterText])

  useEffect(() => {
    if (autoScroll.current && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [logs.length])

  useEffect(() => {
    containerRef.current?.scrollTo(0, 0)
  }, [filterText])

  useEffect(() => {
    if (selectedId !== null && filterText) {
      const log = logs.find((l) => l.id === selectedId)
      if (log && !matchFilter(log, filterText)) {
        onSelectId(null)
      }
    }
  }, [logs, filterText, selectedId, onSelectId])

  const handleClear = async () => {
    try {
      await ClearLogs()
      setLogs([])
      onSelectId(null)
    } catch (err) {
      toast.addToast("error", typeof err === "string" ? err : "failed to clear logs")
    }
  }

  const handleExport = async () => {
    try {
      const logIds = filteredLogs.map((l) => l.id)
      const path = await ExportLogs(logIds, "wirq_logs.json")
      if (!path) {
        return
      }
      toast.addToast(
        "success",
        `${logIds.length} logs were exported to ${path}`,
      )
    } catch (error) {
      const message = typeof error === "string" ? error : "unknown error"
      toast.addToast("error", message)
    }
  }

  const handleScroll = () => {
    const el = containerRef.current
    if (!el) {
      return
    }
    const threshold = 40
    const atBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < threshold
    autoScroll.current = atBottom
  }

  return (
    <div class="flex flex-col flex-1 min-h-0">
      <div class="grid grid-cols-3 items-center gap-3 px-3 py-1.5 border-b border-border bg-card shrink-0">
        <div class="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowFilter(true)}
            disabled={logs.length === 0}
            class={`p-1 transition-colors enabled:cursor-pointer disabled:text-muted-foreground ${
              filterText ? "text-primary" : "text-foreground hover:text-accent"
            }`}
            title="Filter logs"
          >
            <Search class="h-4 w-4" />
          </button>
          <span class="text-xs text-foreground">
            {filterText
              ? `${filteredLogs.length} / ${logs.length} requests`
              : `Requests: ${logs.length}`}
          </span>
        </div>

        <div class="flex justify-center">
          <button
            type="button"
            disabled={filteredLogs.length === 0}
            onClick={handleExport}
            class="p-1 text-foreground transition-colors enabled:hover:text-accent enabled:cursor-pointer disabled:text-muted-foreground"
            title="Export logs"
          >
            <Download class="h-4 w-4" />
          </button>
        </div>

        <div class="flex justify-end">
          <button
            type="button"
            disabled={logs.length === 0}
            onClick={handleClear}
            class="p-1 text-foreground transition-colors enabled:hover:text-accent enabled:cursor-pointer disabled:text-muted-foreground"
            title="Clear logs"
          >
            <BrushCleaning class="h-4 w-4" />
          </button>
        </div>
      </div>

      {logs.length === 0 ? (
        <div class="flex-1 flex flex-col gap-2 items-center justify-center bg-background">
          <img
            src="/images/logo.svg"
            alt=""
            class="w-40 opacity-50 pointer-events-none select-none"
          />
          {!connected ? (
            <span class="text-xs text-center text-muted-foreground">
              Proxy is not running
            </span>
          ) : (
            <span class="text-xs text-center text-muted-foreground animate-pulse">
              Waiting for requests...
            </span>
          )}
        </div>
      ) : (
        <div
          ref={containerRef}
          onScroll={handleScroll}
          class="flex-1 overflow-y-auto overflow-x-hidden bg-background"
        >
          {filteredLogs.length === 0 ? (
            <div class="flex items-center justify-center h-32 text-xs text-muted-foreground">
              No requests match the filter
            </div>
          ) : (
            filteredLogs.map((log) => (
              <RequestRow
                key={log.id}
                log={log}
                selected={selectedId === log.id}
                onClick={() => onSelectId(log.id)}
              />
            ))
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {showFilter && (
        <FilterModal
          initialFilterText={filterText}
          onApply={setFilterText}
          onClose={() => setShowFilter(false)}
        />
      )}
    </div>
  )
}
