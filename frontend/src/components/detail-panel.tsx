import { ClipboardSetText } from "@wailsapp/runtime"
import { Copy, Loader } from "lucide-preact"
import type { ComponentChildren } from "preact"
import { useEffect, useRef, useState } from "preact/hooks"
import { useLogDetail } from "../lib/hooks/logDetail"
import { useToast } from "../lib/providers/toast"
import { requestToRaw, responseToRaw } from "../lib/utils/http-format"
import type { PanelTab, ViewMode } from "../types/index"
import { PrettyView } from "./pretty-view"

interface DetailPanelProps {
  logId: number
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

export function DetailPanel({ logId }: DetailPanelProps) {
  const { detail, error, setError } = useLogDetail(logId)
  const [tab, setTab] = useState<PanelTab>("request")
  const [viewMode, setViewMode] = useState<ViewMode>("pretty")
  const [panelHeight, setPanelHeight] = useState(300)
  const isDragging = useRef(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const toast = useToast()

  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0)
  }, [logId, tab, viewMode])

  useEffect(() => {
    if (error) {
      toast.addToast("error", error)
      setError(null)
    }
  }, [error])

  const handleCopy = async () => {
    if (!detail) {
      return
    }

    try {
      const content =
        tab === "request"
          ? requestToRaw(detail.request)
          : responseToRaw(detail.response)

      const ok = await ClipboardSetText(content)
      if (!ok) {
        toast.addToast("error", "Could not copy to clipboard")
        return
      }
      toast.addToast("success", "Copied to clipboard")
    } catch {
      toast.addToast("error", "An error occurred copying to clipboard")
    }
  }

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) {
        return
      }

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
      {!detail ? (
        <div class="flex-1 flex flex-col gap-2 items-center justify-center bg-background">
          <Loader class="h-3.5 w-3.5 animate-spin" />
          <span class="text-xs text-center text-muted-foreground">
            Loading detail
          </span>
        </div>
      ) : (
        <>
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
            <div class="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={handleCopy}
                class="px-3 p-1.5 text-muted-foreground hover:text-accent transition-colors cursor-pointer"
                title="Copy to clipboard"
              >
                <Copy class="h-4 w-4" />
              </button>
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
          <div ref={scrollRef} class="flex-1 overflow-auto p-3">
            {tab === "request" ? (
              viewMode === "pretty" ? (
                <PrettyView data={detail.request} type="request" />
              ) : (
                <RawView content={requestToRaw(detail.request)} />
              )
            ) : viewMode === "pretty" ? (
              <PrettyView data={detail.response} type="response" />
            ) : (
              <RawView content={responseToRaw(detail.response)} />
            )}
          </div>
        </>
      )}
    </div>
  )
}
