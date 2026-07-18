import type { config } from "@wailsapp/models"
import { EventsOn } from "@wailsapp/runtime"
import { useEffect, useState } from "preact/hooks"
import { DetailPanel } from "./components/detail-panel"
import { Header } from "./components/header"
import { RequestList } from "./components/request-list"
import { SettingsModal } from "./components/settings-modal"
import { useBootstrap, useServer } from "./lib/hooks"
import { useToast } from "./lib/providers/toast"

export const App = () => {
  const {
    config,
    settingsOpen,
    bootError,
    saveSettings,
    closeSettings,
    browseCert,
    toggleTheme,
    setSettingsOpen,
    setBootError,
  } = useBootstrap()

  const { connected, starting, stopping, start, stop } = useServer({
    cfg: config,
  })
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const toast = useToast()

  useEffect(() => {
    if (bootError) {
      toast.addToast("error", bootError)
      setBootError(null)
    }
  }, [bootError])

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
      if (connected) {
        await stop()
      }
      await saveSettings({ cfg })
      setSettingsOpen(false)
      toast.addToast("success", "Settings saved")
    } catch (err) {
      toast.addToast("error", err as string)
    }
  }

  const handleStartServer = async () => {
    try {
      await start()
      toast.addToast("success", "Proxy started")
    } catch (err) {
      toast.addToast("error", `Failed to start proxy: ${err}`)
    }
  }

  const handleStopServer = async () => {
    try {
      await stop()
      toast.addToast("info", "Proxy stopped")
    } catch (err) {
      toast.addToast("error", `Failed to stop proxy: ${err}`)
    }
  }

  return (
    <div class="flex flex-col bg-background text-foreground h-screen">
      <Header
        port={config?.serverPort ?? 0}
        connected={connected}
        starting={starting}
        stopping={stopping}
        onStart={handleStartServer}
        onStop={handleStopServer}
        onSettings={() => setSettingsOpen(true)}
      />
      <RequestList
        connected={connected}
        selectedId={selectedId}
        onSelectId={setSelectedId}
      />
      {selectedId && <DetailPanel logId={selectedId} />}
      {settingsOpen && (
        <SettingsModal
          initial={config}
          onSave={handleSaveSettings}
          onClose={closeSettings}
          onToggleTheme={toggleTheme}
          onBrowseCert={browseCert}
        />
      )}
    </div>
  )
}
