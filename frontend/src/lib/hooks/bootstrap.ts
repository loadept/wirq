import {
  LoadConfig,
  SaveConfig,
  SelectCertFile,
  StopServer,
} from "@wailsapp/app"
import type { config } from "@wailsapp/models"
import { WindowShow } from "@wailsapp/runtime"
import { useEffect, useState } from "preact/hooks"
import type { Theme } from "../../types"

export const useBootstrap = () => {
  const [config, setConfig] = useState<config.ConfigDTO>({
    certPath: "",
    certKeyPath: "",
    serverHost: "",
    serverPort: 0,
    appearance: "dark",
  })
  const [theme, setTheme] = useState<Theme>("dark")
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
  }, [theme])

  useEffect(() => {
    ;(async () => {
      try {
        const cfg = await LoadConfig()
        setConfig(cfg)

        if (cfg.appearance) {
          setTheme(cfg.appearance as Theme)
        }
        if (!cfg.certPath.trim() || !cfg.certKeyPath.trim()) {
          setSettingsOpen(true)
        }
      } catch (err) {
        setError(typeof err === "string" ? err : "unknown error")
        setSettingsOpen(true)
      } finally {
        WindowShow()
      }
    })()
  }, [])

  const saveSettings = async ({
    cfg,
    connected,
  }: {
    cfg: config.ConfigDTO
    connected: boolean
  }) => {
    try {
      await SaveConfig(cfg)
      setConfig(cfg)
      setTheme(cfg.appearance as Theme)

      if (connected) {
        await StopServer()
      }
    } catch (err) {
      setError(typeof err === "string" ? err : "unknown error")
    }
  }

  const closeSettings = () => {
    setTheme(config.appearance as Theme)
    setSettingsOpen(false)
  }

  const browseCert = async () => {
    try {
      const file = await SelectCertFile()
      return file
    } catch (err) {
      setError(typeof err === "string" ? err : "unknown error")
    }
  }

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"))
  }

  return {
    config,
    theme,
    settingsOpen,
    error,
    saveSettings,
    closeSettings,
    browseCert,
    toggleTheme,
    setSettingsOpen,
    setError,
  }
}
