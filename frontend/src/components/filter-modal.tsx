import { Search } from "lucide-preact"
import { useMemo, useRef, useState } from "preact/hooks"
import { parseTokens } from "../lib/utils/filter"
import { Modal } from "./modal"

interface FilterModalProps {
  initialFilterText: string
  onApply: (text: string) => void
  onClose: () => void
}

export function FilterModal({
  initialFilterText,
  onApply,
  onClose,
}: FilterModalProps) {
  const [inputText, setInputText] = useState(initialFilterText)
  const inputRef = useRef<HTMLInputElement>(null)

  const tokens = useMemo(() => parseTokens(inputText), [inputText])

  const handleApply = () => {
    onApply(inputText)
    onClose()
  }

  return (
    <Modal title="Filter">
      <div class="p-4 space-y-3">
        <div class="relative">
          <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onInput={(e) => setInputText((e.target as HTMLInputElement).value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleApply()
            }}
            placeholder="host:google method:GET status:/^4/"
            class="w-full pl-8 pr-2.5 py-1.5 text-sm bg-background border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {tokens.length > 0 && (
          <div class="flex flex-wrap gap-1.5">
            {tokens.map((t, i) => (
              <span
                key={i}
                class="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-primary/10 text-primary rounded cursor-default"
              >
                {t.key ? (
                  <>
                    <span class="text-primary">{t.key}:</span>
                    <span class="text-foreground/90">{t.value}</span>
                  </>
                ) : (
                  <span class="text-foreground/90">{t.value}</span>
                )}
              </span>
            ))}
          </div>
        )}

        <div class="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            class="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            class="px-4 py-1.5 text-xs bg-primary text-primary-foreground hover:opacity-80 rounded cursor-pointer"
          >
            Apply
          </button>
        </div>
      </div>
    </Modal>
  )
}
