import { render } from "preact"
import { App } from "./app"
import { ToastProvider } from "./lib/providers/toast"

const root = document.getElementById("app")
if (root) {
  render(
    <ToastProvider>
      <App />
    </ToastProvider>,
    root,
  )
}
