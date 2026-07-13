<div align="center">
    <img
        src="https://assets.loadept.com/wirq_logo.svg"
        alt="wirq"
        width="128"
    />
    <h1>wirq</h1>
    <p>
        A lightweight, fast, open-source MITM HTTP proxy for developers
    </p>
    <p>
        <a href="https://wirq.loadept.com">🌐 Homepage</a> &nbsp;|&nbsp;
        <a href="https://github.com/loadept/wirq">💻 GitHub</a>
    </p>
</div>

## Features

- Intercepts HTTP and HTTPS (CONNECT) traffic in real time
- Inspects request and response headers, bodies, and status codes
- Decompresses gzip, brotli, and zstd response bodies automatically
- Truncates large text bodies at 10 KB for readability
- Dark / light theme
- Single-instance lock (re-focuses existing window)

## Prerequisites

- [Go](https://go.dev) 1.26+
- [Bun](https://bun.sh)
- [Wails CLI v2](https://wails.io) — install with `go install github.com/wailsapp/wails/v2/cmd/wails@latest`
- **Linux**: requires `webkit2gtk-4.1` (build tag `webkit2_41`)

## CA Certificates

wirq is a MITM proxy and needs a **CA certificate pair** (PEM) to dynamically generate TLS certificates for intercepted hosts. It does **not** generate its own CA — you provide one.

The easiest way is with [mkcert](https://github.com/FiloSottile/mkcert):

```bash
# Install mkcert and create a local CA trusted by your system
mkcert -install

# Locate the generated PEM files
mkcert -CAROOT
# → ~/.local/share/mkcert  (Linux)
# → ~/Library/Application Support/mkcert  (macOS)
```

Load these two files into wirq's settings:

| Field | Value |
|---|---|
| Cert Path | `$(mkcert -CAROOT)/rootCA.pem` |
| Cert Key Path | `$(mkcert -CAROOT)/rootCA-key.pem` |

## Quick start

```bash
git clone https://github.com/loadept/wirq
cd wirq

# Install frontend dependencies
cd frontend && bun install && cd ..

# Run in development mode (live reload)
# On Linux: append -tags webkit2_41
wails dev
```

The app window will open. If no certificates are configured, the settings modal appears automatically. Set your CA cert paths (see above) and click **Start**.

## Build

```bash
# On Linux: append -tags webkit2_41
wails build
```

The binary is written to `build/bin/wirq`.

```bash
./build/bin/wirq --version
```

## Configuration

wirq stores its configuration at:

- **Linux**: `~/.config/wirq/config.json`
- **macOS**: `~/Library/Application Support/wirq/config.json`
- **Windows**: `%AppData%/wirq/config.json`

Default values:

```json
{
  "server": { "host": "127.0.0.1", "port": 3100 },
  "general": { "appearance": "dark" }
}
```

## Development commands

| Action | Command |
|---|---|
| Dev mode (live reload) | `wails dev` (Linux: `wails dev -tags webkit2_41`) |
| Production build | `wails build` (Linux: `wails build -tags webkit2_41`) |
| Frontend lint / format | `cd frontend && bun run --bun biome check --write src/` |
| Frontend standalone | `cd frontend && bun run dev` |
