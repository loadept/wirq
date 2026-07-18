import { EventsOn } from "@wailsapp/runtime"
import { useEffect, useState } from "preact/hooks"
import type { LogSummary } from "../../types"

const MAX_LOGS = 1000

function useLogList(connected: boolean) {
  const [logs, setLogs] = useState<LogSummary[]>([])

  useEffect(() => {
    if (connected) {
      const cancel = EventsOn("proxy:log", (log: LogSummary) => {
        setLogs((prev) => {
          const next = [...prev, log]
          return next.length > MAX_LOGS
            ? next.slice(next.length - MAX_LOGS)
            : next
        })
      })
      return cancel
    }
  }, [connected])

  return { logs, setLogs }
}

export default useLogList
