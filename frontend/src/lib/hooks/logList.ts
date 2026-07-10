import { EventsOn } from "@wailsapp/runtime"
import { useEffect, useState } from "preact/hooks"
import type { LogSummary } from "../../types"

export const useLogs = (connected: boolean) => {
  const [logs, setLogs] = useState<LogSummary[]>([])

  useEffect(() => {
    if (connected) {
      const cancel = EventsOn("proxy:log", (log: LogSummary) => {
        setLogs((prev) => [...prev, log])
      })
      return cancel
    }
  }, [connected])

  return { logs, setLogs }
}
