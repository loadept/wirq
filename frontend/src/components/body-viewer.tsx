import {
  Download,
  Eye,
  File,
  FileArchive,
  FileAudio,
  FileCode,
  FileImage,
  FileJson,
  FileType,
  FileVideo,
} from "lucide-preact"
import type { ComponentChild } from "preact"
import { useEffect, useRef, useState } from "preact/hooks"

interface BodyViewerProps {
  body: unknown
  isBase64: boolean
  contentType: string
}

const TRUNCATE_SUFFIX = " ...[truncate]"

function tryParseJSON(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function formatSize(bytes: number): string {
  if (bytes > 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
  if (bytes > 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  return `${bytes} B`
}

function getFileLabel(contentType: string): string {
  const ct = contentType.toLowerCase()
  if (ct.startsWith("image/png")) {
    return "PNG Image"
  }
  if (ct.startsWith("image/jpeg")) {
    return "JPEG Image"
  }
  if (ct.startsWith("image/gif")) {
    return "GIF Image"
  }
  if (ct.startsWith("image/webp")) {
    return "WebP Image"
  }
  if (ct.startsWith("image/svg")) {
    return "SVG Image"
  }
  if (ct.startsWith("image/")) {
    return "Image"
  }
  if (ct === "application/pdf") {
    return "PDF Document"
  }
  if (ct.includes("zip")) {
    return "ZIP Archive"
  }
  if (ct.includes("rar")) {
    return "RAR Archive"
  }
  if (ct.includes("tar")) {
    return "TAR Archive"
  }
  if (ct.includes("gzip") || ct.includes("gz")) {
    return "GZip Archive"
  }
  if (ct.includes("compress")) {
    return "Compressed Archive"
  }
  if (ct.startsWith("video/")) {
    return "Video"
  }
  if (ct.startsWith("audio/")) {
    return "Audio"
  }
  if (ct.includes("json")) {
    return "JSON"
  }
  if (ct.includes("html")) {
    return "HTML"
  }
  if (ct.includes("xml")) {
    return "XML"
  }
  if (ct.includes("octet-stream")) {
    return "Binary"
  }
  return contentType
}

function isPreviewable(contentType: string): boolean {
  const ct = contentType.toLowerCase()
  return (
    ct.startsWith("image/") ||
    ct === "application/pdf" ||
    ct.startsWith("video/") ||
    ct.startsWith("audio/")
  )
}

function ActionButton({
  onClick,
  icon,
  label,
}: {
  onClick: () => void
  icon: ComponentChild
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      class="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded hover:bg-muted transition-colors cursor-pointer"
    >
      {icon}
      {label}
    </button>
  )
}

function DownloadButton({
  data,
  contentType,
}: {
  data: string
  contentType: string
}) {
  return (
    <a
      href={`data:${contentType};base64,${data}`}
      download="response"
      class="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded hover:bg-muted transition-colors"
    >
      <Download class="h-3.5 w-3.5" />
      Download
    </a>
  )
}

function JsonViewer({ data }: { data: unknown }) {
  const formatted = JSON.stringify(data, null, 2)
  return (
    <div>
      <div class="text-xs text-muted-foreground mb-1">
        <FileJson class="h-3.5 w-3.5 inline mr-1" />
        JSON — {formatSize(new TextEncoder().encode(formatted).length)}
      </div>
      <pre class="text-sm text-foreground/80 whitespace-pre bg-background border border-border rounded p-3">
        {formatted}
      </pre>
    </div>
  )
}

function TextViewer({ text }: { text: string }) {
  return (
    <pre class="text-sm text-foreground/80 whitespace-pre-wrap break-all bg-background border border-border rounded p-3">
      {text}
    </pre>
  )
}

function BinaryInfoBanner({ contentType }: { contentType: string }) {
  const label = getFileLabel(contentType)
  let Icon = File
  const ct = contentType.toLowerCase()
  if (ct.startsWith("image/")) {
    Icon = FileImage
  } else if (ct === "application/pdf") {
    Icon = FileType
  } else if (
    ct.includes("zip") ||
    ct.includes("rar") ||
    ct.includes("tar") ||
    ct.includes("gzip") ||
    ct.includes("gz") ||
    ct.includes("compress")
  ) {
    Icon = FileArchive
  } else if (ct.startsWith("video/")) {
    Icon = FileVideo
  } else if (ct.startsWith("audio/")) {
    Icon = FileAudio
  }

  return (
    <div class="text-xs text-muted-foreground space-y-1">
      <div class="flex items-center gap-1.5">
        <Icon class="h-3.5 w-3.5" />
        <span>{label}</span>
      </div>
      <div class="text-muted-foreground/70">
        Base64-encoded by proxy — Content-Type: {contentType}
      </div>
    </div>
  )
}

function BinaryPreview({
  data,
  contentType,
}: {
  data: string
  contentType: string
}) {
  const ct = contentType.toLowerCase()

  if (ct.startsWith("image/")) {
    return (
      <div class="flex items-center justify-center bg-background border border-border rounded p-2 max-h-[35vh] overflow-auto">
        <img
          src={`data:${contentType};base64,${data}`}
          class="max-w-full max-h-[35vh] object-contain"
          alt="Response content"
        />
      </div>
    )
  }

  if (ct === "application/pdf") {
    return (
      <embed
        class="w-full min-h-[35vh] border border-border rounded bg-background"
        src={`data:${contentType};base64,${data}`}
        title="PDF Preview"
      />
    )
  }

  if (ct.startsWith("video/")) {
    return (
      // biome-ignore lint/a11y/useMediaCaption: inspecting arbitrary intercepted traffic, no transcript available
      <video
        controls
        class="max-w-full max-h-[35vh] border border-border rounded"
      >
        <source src={`data:${contentType};base64,${data}`} type={contentType} />
      </video>
    )
  }

  if (ct.startsWith("audio/")) {
    return (
      // biome-ignore lint/a11y/useMediaCaption: inspecting arbitrary intercepted traffic, no transcript available
      <audio controls class="w-full">
        <source src={`data:${contentType};base64,${data}`} type={contentType} />
      </audio>
    )
  }

  return null
}

export function BodyViewer({ body, isBase64, contentType }: BodyViewerProps) {
  const [showPreview, setShowPreview] = useState(false)
  const prevBodyRef = useRef(body)
  useEffect(() => {
    if (prevBodyRef.current !== body) {
      setShowPreview(false)
      prevBodyRef.current = body
    }
  }, [body])

  if (body === null || body === undefined || body === "") {
    return (
      <div class="text-muted-foreground italic px-1 py-2 text-xs">
        (no body)
      </div>
    )
  }

  if (isBase64) {
    const data = body as string
    const sizeBytes = Math.round((data.length * 3) / 4)
    const previewable = isPreviewable(contentType)

    if (!showPreview) {
      return (
        <div class="space-y-2">
          <BinaryInfoBanner contentType={contentType} />
          <div class="text-xs text-muted-foreground/70">
            Size: {formatSize(sizeBytes)}
          </div>
          <div class="flex gap-2">
            {previewable && (
              <ActionButton
                icon={<Eye class="h-3.5 w-3.5" />}
                label="Preview"
                onClick={() => setShowPreview(true)}
              />
            )}
            <DownloadButton data={data} contentType={contentType} />
          </div>
        </div>
      )
    }

    const preview = <BinaryPreview data={data} contentType={contentType} />
    if (preview) {
      return (
        <div class="space-y-2">
          <BinaryInfoBanner contentType={contentType} />
          <div class="flex gap-2">
            <ActionButton
              icon={<Eye class="h-3.5 w-3.5" />}
              label="Back"
              onClick={() => setShowPreview(false)}
            />
            <DownloadButton data={data} contentType={contentType} />
          </div>
          {preview}
        </div>
      )
    }

    return (
      <div class="space-y-2">
        <BinaryInfoBanner contentType={contentType} />
        <div class="flex gap-2">
          <DownloadButton data={data} contentType={contentType} />
        </div>
      </div>
    )
  }

  if (typeof body === "object") {
    return <JsonViewer data={body} />
  }

  const str = String(body)
  const isTruncated = str.endsWith(TRUNCATE_SUFFIX)
  const cleanStr = isTruncated ? str.slice(0, -TRUNCATE_SUFFIX.length) : str
  const ct = contentType.toLowerCase()

  if (ct.includes("json")) {
    const parsed = tryParseJSON(cleanStr)
    if (parsed !== null) {
      return <JsonViewer data={parsed} />
    }
    return <TextViewer text={cleanStr} />
  }

  if (ct.includes("html")) {
    if (isTruncated) {
      if (!showPreview) {
        return (
          <div class="space-y-2">
            <div class="bg-destructive/10 text-destructive px-3 py-1 text-xs border border-destructive/30 rounded">
              <FileCode class="h-3.5 w-3.5 inline mr-1" />
              Body truncated (10KB limit by proxy)
            </div>
            <div class="text-xs text-muted-foreground">
              HTML content — {formatSize(cleanStr.length)}
            </div>
            <ActionButton
              icon={<Eye class="h-3.5 w-3.5" />}
              label="Show Raw"
              onClick={() => setShowPreview(true)}
            />
          </div>
        )
      }
      return (
        <div class="space-y-2">
          <div class="bg-destructive/10 text-destructive px-3 py-1 text-xs border border-destructive/30 rounded">
            Body truncated (10KB limit by proxy)
          </div>
          <ActionButton
            icon={<Eye class="h-3.5 w-3.5" />}
            label="Back"
            onClick={() => setShowPreview(false)}
          />
          <TextViewer text={cleanStr} />
        </div>
      )
    }

    if (!showPreview) {
      return (
        <div class="space-y-2">
          <div class="text-xs text-muted-foreground">
            <FileCode class="h-3.5 w-3.5 inline mr-1" />
            HTML content — {formatSize(cleanStr.length)}
          </div>
          <ActionButton
            icon={<Eye class="h-3.5 w-3.5" />}
            label="Preview"
            onClick={() => setShowPreview(true)}
          />
        </div>
      )
    }

    return (
      <div class="space-y-2">
        <ActionButton
          icon={<Eye class="h-3.5 w-3.5" />}
          label="Back"
          onClick={() => setShowPreview(false)}
        />
        <iframe
          class="w-full min-h-[35vh] border border-border rounded bg-background"
          srcDoc={cleanStr}
          title="HTML Preview"
          sandbox=""
        />
      </div>
    )
  }

  if (ct.includes("xml")) {
    return (
      <div>
        <div class="text-xs text-muted-foreground mb-1">
          <FileCode class="h-3.5 w-3.5 inline mr-1" />
          XML — {formatSize(cleanStr.length)}
        </div>
        <TextViewer text={cleanStr} />
      </div>
    )
  }

  return <TextViewer text={str} />
}
