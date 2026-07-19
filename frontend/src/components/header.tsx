import { Loader, Play, Settings, Square } from "lucide-preact"
import { ConnectionStatus } from "./connection-status"

interface HeaderProps {
  port: number
  connected: boolean
  starting: boolean
  stopping: boolean
  onStart: () => void
  onStop: () => void
  onSettings: () => void
}

export function Header({
  port,
  connected,
  starting,
  stopping,
  onStart,
  onStop,
  onSettings,
}: HeaderProps) {
  return (
    <header class="grid grid-cols-3 items-center gap-3 px-3 h-11 border-b border-border bg-card shrink-0">
      <ConnectionStatus port={port} connected={connected} />

      <div class="flex justify-center gap-2">
        <button
          type="button"
          onClick={connected ? onStop : onStart}
          disabled={starting || stopping}
          class={`flex items-center justify-center gap-1 min-w-25 px-2.5 py-1 text-xs rounded transition-all duration-100 cursor-pointer disabled:opacity-40 disabled:cursor-auto enabled:hover:opacity-90 ${
            connected
              ? "bg-destructive text-destructive-foreground"
              : "bg-primary text-primary-foreground"
          }`}
        >
          {connected ? (
            stopping ? (
              <>
                <Loader class="h-3.5 w-3.5 animate-spin" />
                Stopping
              </>
            ) : (
              <>
                <Square class="h-3.5 w-3.5" />
                Shutdown
              </>
            )
          ) : starting ? (
            <>
              <Loader class="h-3.5 w-3.5 animate-spin" />
              Starting
            </>
          ) : (
            <>
              <Play class="h-3.5 w-3.5" />
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
          title="Open settings"
        >
          <Settings class="h-4 w-4" />
        </button>
      </div>
    </header>
  )
}
