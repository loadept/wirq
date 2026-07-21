import { GetLogDetail } from "@wailsapp/app"
import type { proxy } from "@wailsapp/models"
import { useEffect, useState } from "preact/hooks"

function useLogDetail(logId: number) {
  const [detail, setDetail] = useState<proxy.LogEntry | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let canceled = false
    setDetail(null)
    setError(null)

    ;(async () => {
      try {
        const d = await GetLogDetail(logId)
        if (!canceled) {
          setDetail(d)
        }
      } catch (err) {
        const msg = typeof err === "string" ? err : "unknown error"
        setError(msg)
      }
    })()

    return () => {
      canceled = true
    }
  }, [logId])

  return { detail, error, setError }
}

export default useLogDetail
