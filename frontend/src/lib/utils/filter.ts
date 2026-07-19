import type { LogSummary } from "../../types/index"

interface FilterToken {
  key?: string
  value: string
  type: "substring" | "exact" | "regex"
  raw: string
}

const VALID_KEYS = ["host", "method", "status", "url", "proto", "tls"]

const parseToken = (token: string): FilterToken => {
  const idx = token.indexOf(":")
  if (idx === -1) {
    return { value: token, type: "substring", raw: token }
  }

  const key = token.slice(0, idx)
  const val = token.slice(idx + 1)

  if (!VALID_KEYS.includes(key)) {
    return { value: token, type: "substring", raw: token }
  }

  if (val.startsWith("=")) {
    return { key, value: val.slice(1), type: "exact", raw: token }
  }
  if (val.startsWith("/") && val.endsWith("/") && val.length > 1) {
    return { key, value: val.slice(1, -1), type: "regex", raw: token }
  }

  return { key, value: val, type: "substring", raw: token }
}

const matchField = (field: string, filter: FilterToken): boolean => {
  switch (filter.type) {
    case "exact":
      return field === filter.value
    case "regex":
      try {
        return new RegExp(filter.value).test(field)
      } catch {
        return false
      }
    case "substring":
      return field.toLowerCase().includes(filter.value.toLowerCase())
  }
}

const matchToken = (log: LogSummary, token: string): boolean => {
  const parsed = parseToken(token)

  if (!parsed.key) {
    const searchIn = [log.url, log.host].join(" ")
    return searchIn.toLowerCase().includes(parsed.value.toLowerCase())
  }

  switch (parsed.key) {
    case "host":
      return matchField(log.host, parsed)
    case "method":
      return matchField(log.method, parsed)
    case "url":
      return matchField(log.url, parsed)
    case "proto":
      return matchField(log.proto, parsed)
    case "status":
      return matchField(String(log.statusCode), parsed)
    case "tls":
      if (parsed.type === "substring") {
        return parsed.value === "true" ? log.tls : !log.tls
      }
      return matchField(String(log.tls), parsed)
    default:
      return true
  }
}

export const matchFilter = (log: LogSummary, text: string): boolean => {
  if (!text.trim()) {
    return true
  }
  return text
    .trim()
    .split(/\s+/)
    .every((t) => matchToken(log, t))
}

export const parseTokens = (text: string): FilterToken[] => {
  if (!text.trim()) {
    return []
  }
  return text
    .trim()
    .split(/\s+/)
    .map(parseToken)
    .filter((t) => t.value.length > 0)
}

export type { FilterToken }
