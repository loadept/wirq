import {
  LoadConfig,
  SaveConfig,
  SelectCertFile,
  StartServer,
  StopServer,
} from "@wailsapp/app"
import type { config } from "@wailsapp/models"
import { EventsOn } from "@wailsapp/runtime"
import { useCallback, useEffect, useState } from "preact/hooks"
import { DetailPanel } from "./components/detail-panel"
import { Header } from "./components/header"
import { RequestList } from "./components/request-list"
import { SettingsModal } from "./components/settings-modal"
import { useToast } from "./lib/toast"
import type { ProxyLog, Theme } from "./types/index"

export const App = () => {
  const [logs, setLogs] = useState<ProxyLog[]>([])
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [theme, setTheme] = useState<Theme>("light")
  const [connected, setConnected] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [config, setConfig] = useState<config.ConfigDTO>({
    certPath: "",
    certKeyPath: "",
    serverHost: "",
    serverPort: 0,
    appearance: "",
  })
  const [starting, setStarting] = useState(false)
  const [shuttingDown, setShuttingDown] = useState(false)
  const toast = useToast()

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
  }, [theme])

  useEffect(() => {
    const handleLoad = async () => {
      try {
        const cfg = await LoadConfig()
        setConfig(cfg)
        if (cfg.appearance) setTheme(cfg.appearance as Theme)
        if (!(cfg.certPath.trim() && cfg.certKeyPath.trim())) {
          setSettingsOpen(true)
        }
      } catch (error) {
        const message = typeof error === "string" ? error : "unknown error"
        toast.addToast("error", message)
      }
    }
    handleLoad()
  }, [])

  useEffect(() => {
    if (connected) {
      const cancel = EventsOn("proxy:log", (log: ProxyLog) => {
        setLogs((prev) => [...prev, log])
      })
      return () => cancel()
    }
  }, [connected])

  useEffect(() => {
    if (connected) {
      const cancel = EventsOn("proxy:error", (error: string) => {
        toast.addToast("error", `Proxy error: ${error}`)
      })
      return () => cancel()
    }
  }, [connected])

  const handleClear = () => {
    setLogs([])
    setSelectedIndex(null)
  }

  const handleSave = async (cfg: config.ConfigDTO) => {
    try {
      await SaveConfig(cfg)
      setConfig(cfg)
      setTheme(cfg.appearance as Theme)
      setSettingsOpen(false)
      if (connected) {
        await StopServer()
        setConnected(false)
      }
      toast.addToast("success", "Settings saved")
    } catch (error) {
      const message = typeof error === "string" ? error : "unknown error"
      toast.addToast("error", message)
    }
  }

  const handleClose = useCallback(() => {
    setTheme(config.appearance as Theme)
    setSettingsOpen(false)
  }, [config.appearance])

  const handleBrowseCert = async () => {
    try {
      return await SelectCertFile()
    } catch (error) {
      const message = typeof error === "string" ? error : "unknown error"
      toast.addToast("error", message)
    }
  }

  const handleStart = async () => {
    setStarting(true)
    try {
      await StartServer(config)
      setConnected(true)
      toast.addToast("success", "Proxy started")
    } catch (error) {
      const message = typeof error === "string" ? error : "unknown error"
      toast.addToast("error", `Failed to start proxy: ${message}`)
    } finally {
      setStarting(false)
    }
  }

  const handleShutdown = async () => {
    setShuttingDown(true)
    try {
      await StopServer()
      setConnected(false)
      toast.addToast("info", "Proxy stopped")
    } catch (error) {
      const message = typeof error === "string" ? error : "unknown error"
      toast.addToast("error", `Failed to stop proxy: ${message}`)
    } finally {
      setShuttingDown(false)
    }
  }

  const selectedLog =
    selectedIndex !== null ? (logs[selectedIndex] ?? null) : null

  return (
    <div class="flex flex-col h-screen bg-background text-foreground">
      <Header
        port={config.serverPort}
        connected={connected}
        starting={starting}
        shuttingDown={shuttingDown}
        onStart={handleStart}
        onShutdown={handleShutdown}
        onSettings={() => setSettingsOpen(true)}
      />
      <RequestList
        connected={connected}
        logs={logs}
        selectedIndex={selectedIndex}
        onSelect={setSelectedIndex}
        onClear={handleClear}
      />
      {selectedLog && <DetailPanel event={selectedLog} />}
      {settingsOpen && (
        <SettingsModal
          initial={config}
          onSave={handleSave}
          onToggleTheme={() =>
            setTheme((prev: Theme) => (prev === "dark" ? "light" : "dark"))
          }
          onClose={handleClose}
          onBrowseCert={handleBrowseCert}
        />
      )}
    </div>
  )
}
