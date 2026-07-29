#!/usr/bin/env bash
set -euo pipefail

RED='\033[31m'
GREEN='\033[32m'
YELLOW='\033[33m'
RESET='\033[0m'

ARCH=$(uname -m)
OS=$(uname -s)

if [ "$OS" != "Linux" ] || [ "$ARCH" != "x86_64" ]; then
    echo -e "${RED}Error: wirq only supports Linux x86_64. Detected: $OS / $ARCH${RESET}"
    exit 1
fi

if [ -f /opt/wirq/wirq ] && [ "${1:-}" != "--force" ]; then
    echo -e "${YELLOW}wirq is already installed at /opt/wirq/. Use --force to reinstall.${RESET}"
    exit 0
fi

URL="https://github.com/loadept/wirq/releases/latest/download/wirq-linux-amd64.tar.gz"
TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

echo -e "${YELLOW}Downloading wirq...${RESET}"
curl -fsSL "$URL" | tar -xz -C "$TMPDIR"

echo -e "${YELLOW}Installing to /opt/wirq/...${RESET}"
sudo mkdir -p /opt/wirq
sudo cp "$TMPDIR"/wirq /opt/wirq/
sudo cp "$TMPDIR"/icon.png /opt/wirq/
sudo cp "$TMPDIR"/wirq.desktop /opt/wirq/
sudo cp "$TMPDIR"/LICENSE /opt/wirq/

echo -e "${YELLOW}Creating symlinks...${RESET}"
sudo ln -sf /opt/wirq/wirq /usr/local/bin/wirq
sudo ln -sf /opt/wirq/wirq.desktop /usr/share/applications/wirq.desktop
sudo ln -sf /opt/wirq/icon.png /usr/share/pixmaps/wirq.png

ls -la /usr/local/bin/wirq /usr/share/applications/wirq.desktop /usr/share/pixmaps/wirq.png 2>/dev/null || true

echo -e "${GREEN}wirq installed. Run: wirq${RESET}"
