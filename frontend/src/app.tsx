import { StartServer, StopServer } from "@wailsapp/app"
import type { config } from "@wailsapp/models"
import { EventsOn } from "@wailsapp/runtime"
import { useEffect, useState } from "preact/hooks"
import { DetailPanel } from "./components/detail-panel"
import { Header } from "./components/header"
import { RequestList } from "./components/request-list"
import { SettingsModal } from "./components/settings-modal"
import { useBootstrap } from "./lib/hooks/bootstrap"
import { useToast } from "./lib/providers/toast"

export const App = () => {
  const {
    config,
    settingsOpen,
    error,
    saveSettings,
    closeSettings,
    browseCert,
    toggleTheme,
    setSettingsOpen,
    setError,
  } = useBootstrap()

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [connected, setConnected] = useState(false)
  const [starting, setStarting] = useState(false)
  const [shuttingDown, setShuttingDown] = useState(false)
  const toast = useToast()

  useEffect(() => {
    if (error) {
      toast.addToast("error", error)
      setError(null)
    }
  }, [error])

  useEffect(() => {
    if (connected) {
      const cancel = EventsOn("proxy:error", (error: string) => {
        toast.addToast("error", `Proxy error: ${error}`)
      })
      return cancel
    }
  }, [connected])

  const handleSaveSettings = async (cfg: config.ConfigDTO) => {
    try {
      await saveSettings({ cfg, connected })
      setConnected(false)
      setSettingsOpen(false)
      toast.addToast("success", "Settings saved")
    } catch (error) {
      toast.addToast(
        "error",
        typeof error === "string" ? error : "unknown error",
      )
    }
  }

  const handleStartSrv = async () => {
    setStarting(true)
    try {
      await StartServer(config)
      setConnected(true)
      toast.addToast("success", "Proxy started")
    } catch (error) {
      toast.addToast(
        "error",
        `Failed to start proxy: ${typeof error === "string" ? error : "unknown error"}`,
      )
    } finally {
      setStarting(false)
    }
  }

  const handleShutdownSrv = async () => {
    setShuttingDown(true)
    try {
      await StopServer()
      setConnected(false)
      toast.addToast("info", "Proxy stopped")
    } catch (error) {
      toast.addToast(
        "error",
        `Failed to stop proxy: ${typeof error === "string" ? error : "unknown error"}`,
      )
    } finally {
      setShuttingDown(false)
    }
  }

  return (
    <div class="flex flex-col bg-background text-foreground h-screen">
      <Header
        port={config?.serverPort ?? 0}
        connected={connected}
        starting={starting}
        shuttingDown={shuttingDown}
        onStart={handleStartSrv}
        onShutdown={handleShutdownSrv}
        onSettings={() => setSettingsOpen(true)}
      />
      <RequestList
        connected={connected}
        selectedId={selectedId}
        onSelectId={setSelectedId}
      />
      {selectedId && <DetailPanel logId={selectedId} />}
      {settingsOpen && config && (
        <SettingsModal
          initial={config}
          onSave={handleSaveSettings}
          onToggleTheme={toggleTheme}
          onClose={closeSettings}
          onBrowseCert={browseCert}
        />
      )}
    </div>
  )
}
