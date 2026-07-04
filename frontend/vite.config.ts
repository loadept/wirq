import path from "node:path"
import preact from "@preact/preset-vite"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [preact(), tailwindcss()],
  resolve: {
    alias: {
      "@wailsapp/app": path.resolve(__dirname, "./wailsjs/go/main/App"),
      "@wailsapp/runtime": path.resolve(__dirname, "./wailsjs/runtime/runtime"),
      "@wailsapp/models": path.resolve(__dirname, "./wailsjs/go/models"),
    },
  },
})
