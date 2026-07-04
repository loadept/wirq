import { Circle } from "lucide-preact"

interface ConnectionStatusProps {
  port: number
  connected: boolean
}

export function ConnectionStatus({ port, connected }: ConnectionStatusProps) {
  return (
    <span class="flex items-center gap-1.5 text-xs text-foreground">
      <Circle
        class={`h-2.5 w-2.5 ${
          connected
            ? "fill-green text-green animate-pulse"
            : "fill-destructive text-destructive"
        }`}
      />
      {connected ? `Listening :${port}` : "Disconnected"}
    </span>
  )
}
