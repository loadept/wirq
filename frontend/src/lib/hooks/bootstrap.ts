import {
  LoadConfig,
  SaveConfig,
  SelectCertFile,
  StartServer,
  StopServer,
} from "@wailsapp/app"
import type { config } from "@wailsapp/models"
import { WindowShow } from "@wailsapp/runtime"
import { useEffect, useState } from "preact/hooks"
import type { Theme } from "../../types"

function useBootstrap() {
  const [config, setConfig] = useState<config.ConfigDTO>({
    certPath: "",
    certKeyPath: "",
    serverHost: "",
    serverPort: 0,
    appearance: "dark",
  })
  const [theme, setTheme] = useState<Theme>("dark")
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [bootError, setBootError] = useState<string | null>(null)

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
  }, [theme])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const cfg = await LoadConfig()
        if (cancelled) {
          return
        }

        setConfig(cfg)
        if (cfg.appearance) {
          setTheme(cfg.appearance as Theme)
        }
        if (!cfg.certPath.trim() || !cfg.certKeyPath.trim()) {
          setSettingsOpen(true)
        }
      } catch (err) {
        if (cancelled) {
          return
        }
        setBootError(typeof err === "string" ? err : "unknown error")
        setSettingsOpen(true)
      } finally {
        if (!cancelled) {
          WindowShow()
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const saveSettings = async ({ cfg }: { cfg: config.ConfigDTO }) => {
    try {
      await SaveConfig(cfg)
      setConfig(cfg)
      setTheme(cfg.appearance as Theme)
    } catch (err) {
      throw typeof err === "string" ? err : "unknown error"
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
      throw typeof err === "string" ? err : "unknown error"
    }
  }

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"))
  }

  return {
    config,
    settingsOpen,
    bootError,
    saveSettings,
    closeSettings,
    browseCert,
    toggleTheme,
    setSettingsOpen,
    setBootError,
  }
}

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

export { useBootstrap, useServer }
