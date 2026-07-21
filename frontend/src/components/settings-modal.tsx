import type { config } from "@wailsapp/models"
import { FolderSearch } from "lucide-preact"
import type { TargetedEvent } from "preact"
import { useState } from "preact/hooks"
import { SettingsSchema } from "../schemas/settings"
import { Modal } from "./modal"

interface SettingsModalProps {
  initial: config.ConfigDTO
  onSave: (config: config.ConfigDTO) => void
  onClose: () => void
  onToggleTheme: () => void
  onBrowseCert: () => Promise<string | undefined>
}

export function SettingsModal({
  initial,
  onSave,
  onClose,
  onToggleTheme,
  onBrowseCert,
}: SettingsModalProps) {
  const [cfg, setCfg] = useState<config.ConfigDTO>(initial)
  const [confirm, setConfirm] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [issues, setIssues] = useState<Record<string, string>>({})
  const hasIssues = Object.keys(issues).length > 0

  const handleClose = () => {
    if (dirty) {
      setConfirm(true)
      return
    }
    onClose()
    setDirty(false)
  }

  const setValue = (field: keyof config.ConfigDTO, value: string) => {
    setDirty(true)
    setCfg((prev) => ({
      ...prev,
      [field]: field === "serverPort" ? Number(value) : value,
    }))
    setIssues((prev) => {
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  const handleBrowse = async (field: "certPath" | "certKeyPath") => {
    try {
      const path = await onBrowseCert()
      if (path) {
        setValue(field, path)
      }
    } catch {}
  }

  function handleSubmit(e: TargetedEvent<HTMLFormElement, SubmitEvent>) {
    e.preventDefault()
    const form = e.currentTarget
    const result = SettingsSchema.safeParse(cfg)

    form.querySelectorAll("[data-error]").forEach((el) => {
      el.removeAttribute("data-error")
    })

    if (!result.success) {
      const newErrors: Record<string, string> = {}

      for (const issue of result.error.issues) {
        const field = issue.path[0] as string
        newErrors[field] = issue.message
        form
          .querySelector(`[name="${field}"]`)
          ?.setAttribute("data-error", "true")
      }
      setIssues(newErrors)
      return
    }

    onSave(result.data)
    setDirty(false)
  }

  return (
    <Modal title="Settings" onClose={handleClose}>
      <form onSubmit={handleSubmit}>
        <div class="p-4 space-y-5 overflow-y-auto max-h-[70vh]">
          {hasIssues && (
            <p class="text-xs text-destructive">
              {issues[Object.keys(issues)[0]]}
            </p>
          )}

          <fieldset class="space-y-3">
            <legend class="text-xs tracking-wider text-primary">
              TLS Certificates
            </legend>

            <div>
              <label
                htmlFor="certPath"
                class="block text-xs tracking-wider text-muted-foreground mb-1"
              >
                CA Certificate (.pem)
              </label>
              <div class="flex gap-1">
                <input
                  id="certPath"
                  name="certPath"
                  type="text"
                  value={cfg.certPath}
                  onInput={(e) => setValue("certPath", e.currentTarget.value)}
                  class="flex-1 px-2.5 py-1.5 text-sm bg-background border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-ring border-border data-[error=true]:border-destructive"
                  placeholder="/path/to/rootCA.pem"
                />
                <button
                  type="button"
                  onClick={async () => handleBrowse("certPath")}
                  class="p-2 text-foreground hover:text-accent transition-colors cursor-pointer shrink-0"
                  title="Search in file explorer"
                >
                  <FolderSearch class="h-4 w-4" />
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="certKeyPath"
                class="block text-xs tracking-wider text-muted-foreground mb-1"
              >
                CA Key (.pem)
              </label>
              <div class="flex gap-1 items-start">
                <input
                  id="certKeyPath"
                  name="certKeyPath"
                  type="text"
                  value={cfg.certKeyPath}
                  onInput={(e) =>
                    setValue("certKeyPath", e.currentTarget.value)
                  }
                  class="flex-1 px-2.5 py-1.5 text-sm bg-background border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-ring border-border data-[error=true]:border-destructive"
                  placeholder="/path/to/rootCA-key.pem"
                />
                <button
                  type="button"
                  onClick={async () => handleBrowse("certKeyPath")}
                  class="p-2 text-foreground hover:text-accent transition-colors cursor-pointer shrink-0"
                  title="Search in file explorer"
                >
                  <FolderSearch class="h-4 w-4" />
                </button>
              </div>
            </div>
          </fieldset>

          <fieldset class="space-y-3">
            <legend class="text-xs tracking-wider text-primary">Server</legend>

            <div class="flex gap-2">
              <div class="flex-1 min-w-0">
                <label
                  htmlFor="serverHost"
                  class="block text-xs tracking-wider text-muted-foreground mb-1"
                >
                  Host
                </label>
                <input
                  id="serverHost"
                  name="serverHost"
                  type="text"
                  value={cfg.serverHost}
                  onInput={(e) => setValue("serverHost", e.currentTarget.value)}
                  class="mt-1 w-full px-2.5 py-1.5 text-sm bg-background border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-ring border-border data-[error=true]:border-destructive"
                  placeholder="0.0.0.0"
                />
              </div>

              <div class="w-50 shrink-0">
                <label
                  htmlFor="serverPort"
                  class="block text-xs tracking-wider text-muted-foreground mb-1"
                >
                  Port
                </label>
                <input
                  id="serverPort"
                  name="serverPort"
                  type="number"
                  value={cfg.serverPort}
                  onInput={(e) => setValue("serverPort", e.currentTarget.value)}
                  class="mt-1 w-full px-2.5 py-1.5 text-sm bg-background border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-ring border-border data-[error=true]:border-destructive"
                  placeholder="3100"
                />
              </div>
            </div>
          </fieldset>

          <fieldset class="space-y-3">
            <legend class="text-xs tracking-wider text-primary">
              Appearance
            </legend>
            <div class="flex items-center justify-between">
              <span class="text-xs tracking-wider text-muted-foreground">
                Dark mode
              </span>
              <label class="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={(cfg.appearance || "dark") === "dark"}
                  onChange={() => {
                    setValue(
                      "appearance",
                      cfg.appearance === "dark" ? "light" : "dark",
                    )
                    onToggleTheme()
                  }}
                  class="peer sr-only"
                />
                <span class="w-9 h-5 bg-muted rounded-full peer-checked:bg-primary transition-colors" />
                <span class="absolute left-0.5 top-0.5 w-4 h-4 bg-background rounded-full peer-checked:translate-x-4 transition-transform" />
              </label>
            </div>
          </fieldset>
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
            type="submit"
            disabled={hasIssues}
            class={`px-4 py-1.5 text-xs transition-opacity rounded ${
              hasIssues
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-primary text-primary-foreground hover:opacity-80 cursor-pointer"
            }`}
          >
            Save
          </button>
        </div>
      </form>
      {confirm && (
        <Modal title="Unsaved Changes" class="w-80">
          <div class="p-4 space-y-3">
            <p class="text-xs text-foreground/80">
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
