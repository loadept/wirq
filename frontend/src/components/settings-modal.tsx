import type { config } from "@wailsapp/models"
import { FolderSearch, Moon, Sun } from "lucide-preact"
import { useState } from "preact/hooks"
import type { Errors } from "../types/settings"
import { Modal } from "./modal"

interface SettingsModalProps {
  initial: config.ConfigDTO
  onSave: (config: config.ConfigDTO) => void
  onToggleTheme: () => void
  onClose: () => void
  onBrowseCert: () => Promise<string | undefined>
}

function validate(config: config.ConfigDTO): Errors {
  const errs: Errors = {}
  if (!config.certPath.trim()) {
    errs.certPath = "Required"
  }
  if (!config.certKeyPath.trim()) {
    errs.certKeyPath = "Required"
  }
  if (!config.serverHost.trim()) {
    errs.serverHost = "Required"
  }
  if (
    !config.serverPort ||
    config.serverPort <= 0 ||
    config.serverPort > 65535
  ) {
    errs.serverPort = "Required (1-65535)"
  } else if (!Number.isInteger(config.serverPort)) {
    errs.serverPort = "Must be a whole number"
  }
  return errs
}

export function SettingsModal({
  initial,
  onSave,
  onToggleTheme,
  onClose,
  onBrowseCert,
}: SettingsModalProps) {
  const [config, setConfig] = useState<config.ConfigDTO>(initial)
  const [errors, setErrors] = useState<Errors>({})
  const [confirm, setConfirm] = useState(false)
  const dirty = JSON.stringify(config) !== JSON.stringify(initial)

  const set = (field: keyof config.ConfigDTO, value: string) => {
    setConfig((prev) => ({
      ...prev,
      [field]: field === "serverPort" ? Number(value) : value,
    }))
    setErrors((prev) => {
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  const handleClose = () => {
    if (dirty) {
      setConfirm(true)
      return
    }
    onClose()
  }

  const handleSave = () => {
    const errs = validate(config)
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    onSave(config)
  }

  const hasErrors = Object.keys(errors).length > 0

  return (
    <Modal title="Settings">
      <div class="p-4 space-y-5 overflow-y-auto max-h-[70vh]">
        <fieldset class="space-y-3">
          <legend class="text-xs tracking-wider text-primary">
            TLS Certificates
          </legend>

          <div>
            <label
              htmlFor="ca-cert"
              class="block text-xs tracking-wider text-muted-foreground mb-1"
            >
              CA Certificate (.pem)
            </label>
            <div class="flex gap-1 items-start">
              <div class="flex-1">
                <input
                  id="ca-cert"
                  type="text"
                  value={config.certPath}
                  onInput={(e) =>
                    set("certPath", (e.target as HTMLInputElement).value)
                  }
                  class={`w-full px-2.5 py-1.5 text-sm bg-background border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-ring ${
                    errors.certPath ? "border-destructive" : "border-border"
                  }`}
                  placeholder="/path/to/rootCA.pem"
                />
              </div>
              <button
                type="button"
                onClick={async () => {
                  const path = await onBrowseCert()
                  if (path) {
                    set("certPath", path)
                  }
                }}
                class="p-2 text-foreground border border-border rounded transition-opacity hover:opacity-80 cursor-pointer shrink-0"
                title="Search in file explorer"
              >
                <FolderSearch class="h-4 w-4" />
              </button>
            </div>
            {errors.certPath && (
              <p class="text-xs text-destructive mt-0.5">{errors.certPath}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="ca-key"
              class="block text-xs tracking-wider text-muted-foreground mb-1"
            >
              CA Key (.pem)
            </label>
            <div class="flex gap-1 items-start">
              <div class="flex-1">
                <input
                  id="ca-key"
                  type="text"
                  value={config.certKeyPath}
                  onInput={(e) =>
                    set("certKeyPath", (e.target as HTMLInputElement).value)
                  }
                  class={`w-full px-2.5 py-1.5 text-sm bg-background border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-ring ${
                    errors.certKeyPath ? "border-destructive" : "border-border"
                  }`}
                  placeholder="/path/to/rootCA-key.pem"
                />
              </div>
              <button
                type="button"
                onClick={async () => {
                  const path = await onBrowseCert()
                  if (path) {
                    set("certKeyPath", path)
                  }
                }}
                class="p-2 text-foreground border border-border rounded transition-opacity hover:opacity-80 cursor-pointer shrink-0"
                title="Search in file explorer"
              >
                <FolderSearch class="h-4 w-4" />
              </button>
            </div>
            {errors.certKeyPath && (
              <p class="text-xs text-destructive mt-0.5">
                {errors.certKeyPath}
              </p>
            )}
          </div>
        </fieldset>

        <fieldset class="space-y-3">
          <legend class="text-xs tracking-wider text-primary">Server</legend>

          <div class="flex gap-2">
            <div class="flex-1 min-w-0">
              <label
                htmlFor="server-host"
                class="block text-xs tracking-wider text-muted-foreground mb-1"
              >
                Host
              </label>
              <input
                id="server-host"
                type="text"
                value={config.serverHost}
                onInput={(e) =>
                  set("serverHost", (e.target as HTMLInputElement).value)
                }
                class={`w-full px-2.5 py-1.5 text-sm bg-background border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-ring ${
                  errors.serverHost ? "border-destructive" : "border-border"
                }`}
                placeholder="0.0.0.0"
              />
              {errors.serverHost && (
                <p class="text-xs text-destructive mt-0.5">
                  {errors.serverHost}
                </p>
              )}
            </div>

            <div class="w-50 shrink-0">
              <label
                htmlFor="server-port"
                class="block text-xs tracking-wider text-muted-foreground mb-1"
              >
                Port
              </label>
              <input
                id="server-port"
                type="number"
                value={config.serverPort}
                onInput={(e) =>
                  set("serverPort", (e.target as HTMLInputElement).value)
                }
                class={`w-full px-2.5 py-1.5 text-sm bg-background border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-ring ${
                  errors.serverPort ? "border-destructive" : "border-border"
                }`}
                placeholder="3100"
              />
              {errors.serverPort && (
                <p class="text-xs text-destructive mt-0.5">
                  {errors.serverPort}
                </p>
              )}
            </div>
          </div>
        </fieldset>

        <div class="flex items-center justify-between pt-2 border-t border-border">
          <span class="text-xs tracking-wider text-foreground">Appearance</span>
          <button
            type="button"
            onClick={() => {
              onToggleTheme()
              set("appearance", config.appearance === "dark" ? "light" : "dark")
            }}
            class="p-1.5 text-foreground hover:text-accent transition-colors cursor-pointer"
            title={
              config.appearance === "dark"
                ? "Switch to light mode"
                : "Switch to dark mode"
            }
          >
            {config.appearance === "dark" ? (
              <Sun class="h-4 w-4" />
            ) : (
              <Moon class="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <div class="flex items-center justify-end gap-2 px-4 py-3 border-t border-border">
        <button
          type="button"
          onClick={handleClose}
          class="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={hasErrors}
          class={`px-4 py-1.5 text-xs transition-opacity rounded ${
            hasErrors
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : "bg-primary text-primary-foreground hover:opacity-80 cursor-pointer"
          }`}
        >
          Save
        </button>
      </div>

      {confirm && (
        <Modal title="Unsaved Changes" class="w-80">
          <div class="p-4 space-y-3">
            <p class="text-sm text-foreground/80">
              You have unsaved changes. Discard changes?
            </p>
            <div class="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirm(false)}
                class="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onClose}
                class="px-4 py-1.5 text-xs bg-accent text-primary-foreground hover:opacity-80 rounded cursor-pointer"
              >
                Discard
              </button>
            </div>
          </div>
        </Modal>
      )}
    </Modal>
  )
}
