import type { proxy } from "@wailsapp/models"

function parsePath(url: string): string {
  try {
    const u = new URL(url)
    return u.pathname + u.search
  } catch {
    return url
  }
}

function formatBodyRaw(body: unknown, isBase64: boolean): string {
  if (body === null || body === undefined) {
    return ""
  }
  if (isBase64) {
    return "[base64 encoded]"
  }
  if (typeof body === "object") {
    return JSON.stringify(body)
  }
  return String(body)
}

export function requestToRaw(req: proxy.RequestLog): string {
  const path = parsePath(req.url)
  const lines = [`${req.method} ${path} ${req.proto}`, `Host: ${req.host}`]

  for (const [key, values] of Object.entries(req.headers)) {
    for (const v of values) {
      lines.push(`${key}: ${v}`)
    }
  }

  const body = formatBodyRaw(req.body, req.isBase64)
  if (body) {
    lines.push("")
    lines.push(body)
  }

  return lines.join("\r\n")
}

export function responseToRaw(res: proxy.ResponseLog): string {
  const lines = [`${res.proto} ${res.statusCode}`]

  for (const [key, values] of Object.entries(res.headers)) {
    for (const v of values) {
      lines.push(`${key}: ${v}`)
    }
  }

  const body = formatBodyRaw(res.body, res.isBase64)
  if (body) {
    lines.push("")
    lines.push(body)
  }

  return lines.join("\r\n")
}
