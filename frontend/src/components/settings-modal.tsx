import { useEffect, useRef, useState } from 'preact/hooks'
import { Moon, Sun, X } from 'lucide-preact'
import { config } from '@wailsapp/models'

interface SettingsModalProps {
  initial: config.ConfigDTO
  onSave: (config: config.ConfigDTO) => void
  onToggleTheme: () => void
  onClose: () => void
}

interface Errors {
  certPath?: string
  certKeyPath?: string
  serverHost?: string
  serverPort?: string
  appearance?: string
}

function validate(config: config.ConfigDTO): Errors {
  const errs: Errors = {}
  if (!config.certPath.trim()) errs.certPath = 'Required'
  if (!config.certKeyPath.trim()) errs.certKeyPath = 'Required'
  if (!config.serverHost.trim()) errs.serverHost = 'Required'
  if (!config.serverPort || config.serverPort <= 0 || config.serverPort > 65535) {
    errs.serverPort = 'Required (1-65535)'
  } else if (!Number.isInteger(config.serverPort)) {
    errs.serverPort = 'Must be a whole number'
  }
  return errs
}

export function SettingsModal({
  initial,
  onSave,
  onToggleTheme,
  onClose,
}: SettingsModalProps) {
  const [config, setConfig] = useState<config.ConfigDTO>(initial)
  const [errors, setErrors] = useState<Errors>({})
  const dirty = JSON.stringify(config) !== JSON.stringify(initial)

  const handleClose = () => {
    if (dirty && !window.confirm('Tiene cambios sin guardar. ¿Descartar cambios?')) return
    onClose()
  }
  const dialogRef = useRef<HTMLDialogElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef({ active: false, startX: 0, startY: 0, left: 0, top: 0 })
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)

  useEffect(() => {
    setPos(null)
    dialogRef.current?.showModal()
  }, [])

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      const d = dragRef.current
      if (!d.active) return
      setPos({
        left: d.left + e.clientX - d.startX,
        top: d.top + e.clientY - d.startY,
      })
    }
    const onMouseUp = () => {
      dragRef.current.active = false
      document.body.style.userSelect = ''
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  const handleBackdropClick = (e: MouseEvent) => {
    if (e.target === backdropRef.current) handleClose()
  }

  const handleDragStart = (e: MouseEvent) => {
    const rect = dialogRef.current?.getBoundingClientRect()
    if (!rect) return
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      left: pos?.left ?? rect.left,
      top: pos?.top ?? rect.top,
    }
    document.body.style.userSelect = 'none'
  }

  const set = (field: keyof config.ConfigDTO, value: string) => {
    setConfig((prev) => ({ ...prev, [field]: field === 'serverPort' ? Number(value) : value }))
    setErrors((prev) => {
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  const handleSave = () => {
    const errs = validate(config)
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    onSave(config)
  }

  const hasErrors = Object.keys(errors).length > 0

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
    >
      <dialog
        ref={dialogRef}
        onCancel={(e) => { e.preventDefault(); handleClose() }}
        style={pos ? { left: `${pos.left}px`, top: `${pos.top}px`, margin: 0, position: 'fixed' } : undefined}
        class="m-auto w-full max-w-xl bg-card border border-border rounded p-0 shadow-lg open:flex open:flex-col"
      >
        <div
          onMouseDown={handleDragStart}
          class="flex items-center justify-between px-4 py-3 border-b border-border cursor-grab active:cursor-grabbing select-none"
        >
          <h2 class="text-sm text-foreground uppercase tracking-wider">
            Settings
          </h2>
          <button
            onClick={handleClose}
            class="p-1 text-muted-foreground hover:text-accent transition-colors cursor-pointer"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <div class="p-4 space-y-5 overflow-y-auto max-h-[70vh]">
          <fieldset class="space-y-3">
            <legend class="text-xs uppercase tracking-wider text-primary">
              TLS Certificates
            </legend>

            <div>
              <label class="block text-xs uppercase tracking-wider text-muted-foreground mb-1">
                CA Certificate (.pem)
              </label>
              <input
                type="text"
                value={config.certPath}
                onInput={(e) => set('certPath', (e.target as HTMLInputElement).value)}
                class={`w-full px-2.5 py-1.5 text-sm bg-background border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-ring ${
                  errors.certPath ? 'border-destructive' : 'border-border'
                }`}
                placeholder="/path/to/rootCA.pem"
              />
              {errors.certPath && (
                <p class="text-xs text-destructive mt-0.5">{errors.certPath}</p>
              )}
            </div>

            <div>
              <label class="block text-xs uppercase tracking-wider text-muted-foreground mb-1">
                CA Key (.pem)
              </label>
              <input
                type="text"
                value={config.certKeyPath}
                onInput={(e) => set('certKeyPath', (e.target as HTMLInputElement).value)}
                class={`w-full px-2.5 py-1.5 text-sm bg-background border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-ring ${
                  errors.certKeyPath ? 'border-destructive' : 'border-border'
                }`}
                placeholder="/path/to/rootCA-key.pem"
              />
              {errors.certKeyPath && (
                <p class="text-xs text-destructive mt-0.5">{errors.certKeyPath}</p>
              )}
            </div>
          </fieldset>

          <fieldset class="space-y-3">
            <legend class="text-xs uppercase tracking-wider text-primary">
              Server
            </legend>

            <div>
              <label class="block text-xs uppercase tracking-wider text-muted-foreground mb-1">
                Host
              </label>
              <input
                type="text"
                value={config.serverHost}
                onInput={(e) => set('serverHost', (e.target as HTMLInputElement).value)}
                class={`w-full px-2.5 py-1.5 text-sm bg-background border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-ring ${
                  errors.serverHost ? 'border-destructive' : 'border-border'
                }`}
                placeholder="0.0.0.0"
              />
              {errors.serverHost && (
                <p class="text-xs text-destructive mt-0.5">{errors.serverHost}</p>
              )}
            </div>

            <div>
              <label class="block text-xs uppercase tracking-wider text-muted-foreground mb-1">
                Port
              </label>
              <input
                type="number"
                value={config.serverPort}
                onInput={(e) => set('serverPort', (e.target as HTMLInputElement).value)}
                class={`w-full px-2.5 py-1.5 text-sm bg-background border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-ring ${
                  errors.serverPort ? 'border-destructive' : 'border-border'
                }`}
                placeholder="3100"
              />
              {errors.serverPort && (
                <p class="text-xs text-destructive mt-0.5">{errors.serverPort}</p>
              )}
            </div>
          </fieldset>

          <div class="flex items-center justify-between pt-2 border-t border-border">
            <span class="text-xs uppercase tracking-wider text-foreground">
              Appearance
            </span>
            <button
              onClick={() => { onToggleTheme(); set('appearance', config.appearance === 'dark' ? 'light' : 'dark') }}
              class="p-1.5 text-foreground hover:text-accent transition-colors cursor-pointer"
              title={config.appearance === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {config.appearance === 'dark' ? <Sun class="h-4 w-4" /> : <Moon class="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 px-4 py-3 border-t border-border">
          <button
            onClick={handleClose}
            class="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={hasErrors}
            class={`px-4 py-1.5 text-xs transition-opacity rounded ${
              hasErrors
                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                : 'bg-primary text-primary-foreground hover:opacity-80 cursor-pointer'
            }`}
          >
            Save
          </button>
        </div>
      </dialog>
    </div>
  )
}
