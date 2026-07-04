import { Loader, Play, Settings, Square } from "lucide-preact"
import { ConnectionStatus } from "./connection-status"

interface HeaderProps {
  port: number
  connected: boolean
  starting: boolean
  shuttingDown: boolean
  onStart: () => void
  onShutdown: () => void
  onSettings: () => void
}

export function Header({
  port,
  connected,
  starting,
  shuttingDown,
  onStart,
  onShutdown,
  onSettings,
}: HeaderProps) {
  return (
    <header class="grid grid-cols-3 items-center gap-3 px-3 h-11 border-b border-border bg-card shrink-0">
      <ConnectionStatus port={port} connected={connected} />

      <div class="flex justify-center gap-2">
        <button
          type="button"
          onClick={connected ? onShutdown : onStart}
          disabled={starting || shuttingDown}
          class={`flex items-center justify-center gap-1 min-w-25 px-2.5 py-1 text-xs rounded transition-all duration-100 cursor-pointer disabled:opacity-40 disabled:cursor-auto enabled:hover:opacity-90 ${
            connected
              ? " bg-destructive text-destructive-foreground"
              : "bg-primary text-primary-foreground"
          }`}
        >
          {connected ? (
            shuttingDown ? (
              <>
                <Loader class="h-3 w-3 animate-spin" />
                Stopping
              </>
            ) : (
              <>
                <Square class="h-3 w-3" />
                Shutdown
              </>
            )
          ) : starting ? (
            <>
              <Loader class="h-3 w-3 animate-spin" />
              Starting
            </>
          ) : (
            <>
              <Play class="h-3 w-3" />
              Start
            </>
          )}
        </button>
      </div>

      <div class="flex justify-end">
        <button
          type="button"
          onClick={onSettings}
          class="p-1.5 text-foreground hover:text-accent transition-colors cursor-pointer"
          title="Settings"
        >
          <Settings class="h-4 w-4" />
        </button>
      </div>
    </header>
  )
}
