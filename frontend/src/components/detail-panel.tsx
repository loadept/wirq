import type { ComponentChildren } from "preact"
import { useEffect, useRef, useState } from "preact/hooks"
import { requestToRaw, responseToRaw } from "../lib/utils/http-format"
import type { PanelTab, ProxyLog, ViewMode } from "../types/index"
import { PrettyView } from "./pretty-view"

interface DetailPanelProps {
  event: ProxyLog
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ComponentChildren
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      class={`px-3 py-1.5 text-xs tracking-wider transition-colors cursor-pointer ${
        active
          ? "text-primary border-b-2 border-b-primary"
          : "text-muted-foreground hover:text-foreground border-b-2 border-b-transparent"
      }`}
    >
      {children}
    </button>
  )
}

function RawView({ content }: { content: string }) {
  return (
    <span class="text-sm text-foreground/80 whitespace-pre-wrap break-all">
      {content || "(empty)"}
    </span>
  )
}

export function DetailPanel({ event }: DetailPanelProps) {
  const [tab, setTab] = useState<PanelTab>("request")
  const [viewMode, setViewMode] = useState<ViewMode>("pretty")
  const [panelHeight, setPanelHeight] = useState(300)
  const isDragging = useRef(false)

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return
      const newHeight = window.innerHeight - e.clientY - 36
      setPanelHeight(
        Math.max(150, Math.min(newHeight, window.innerHeight * 0.8)),
      )
    }
    const onMouseUp = () => {
      isDragging.current = false
      document.body.classList.remove("select-none")
    }

    document.addEventListener("mousemove", onMouseMove)
    document.addEventListener("mouseup", onMouseUp)
    return () => {
      document.removeEventListener("mousemove", onMouseMove)
      document.removeEventListener("mouseup", onMouseUp)
    }
  }, [])

  const { request, response } = event

  return (
    <div
      class="border-t border-border bg-card flex flex-col shrink-0"
      style={{ height: `${panelHeight}px` }}
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: resize handle, mouse-only interaction */}
      <div
        class="h-1.5 bg-border cursor-row-resize hover:bg-primary/50 active:bg-primary transition-colors shrink-0"
        onMouseDown={(e) => {
          e.preventDefault()
          isDragging.current = true
          document.body.classList.add("select-none")
        }}
      />
      <div class="flex items-center border-b border-border shrink-0">
        <div class="flex">
          <TabButton
            active={tab === "request"}
            onClick={() => setTab("request")}
          >
            Request
          </TabButton>
          <TabButton
            active={tab === "response"}
            onClick={() => setTab("response")}
          >
            Response
          </TabButton>
        </div>
        <div class="ml-auto flex">
          <TabButton
            active={viewMode === "pretty"}
            onClick={() => setViewMode("pretty")}
          >
            Pretty
          </TabButton>
          <TabButton
            active={viewMode === "raw"}
            onClick={() => setViewMode("raw")}
          >
            Raw
          </TabButton>
        </div>
      </div>
      <div class="flex-1 overflow-auto p-3">
        {tab === "request" ? (
          viewMode === "pretty" ? (
            <PrettyView data={request} type="request" />
          ) : (
            <RawView content={requestToRaw(request)} />
          )
        ) : viewMode === "pretty" ? (
          <PrettyView data={response} type="response" />
        ) : (
          <RawView content={responseToRaw(response)} />
        )}
      </div>
    </div>
  )
}
