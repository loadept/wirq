import { StartServer, StopServer } from "@wailsapp/app"
import type { config } from "@wailsapp/models"
import { useState } from "preact/hooks"

function useServer({ cfg }: { cfg: config.ConfigDTO }) {
  const [connected, setConnected] = useState(false)
  const [starting, setStarting] = useState(false)
  const [stopping, setStopping] = useState(false)

  const start = async () => {
    setStarting(true)
    try {
      await StartServer(cfg)
      setConnected(true)
    } catch (err) {
      throw typeof err === "string" ? err : "unknown error"
    } finally {
      setStarting(false)
    }
  }

  const stop = async () => {
    setStopping(true)
    try {
      await StopServer()
      setConnected(false)
    } catch (err) {
      throw typeof err === "string" ? err : "unknown error"
    } finally {
      setStopping(false)
    }
  }

  return {
    connected,
    starting,
    stopping,
    start,
    stop,
  }
}

export default useServer
