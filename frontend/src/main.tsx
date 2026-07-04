import { render } from 'preact'
import { ToastProvider } from './lib/toast'
import { App } from './app'

const root = document.getElementById('app')
if (root) {
  render(
    <ToastProvider>
      <App />
    </ToastProvider>,
    root,
  )
}
