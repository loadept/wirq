package main

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"

	"github.com/loadept/wirq/internal/config"
	"github.com/loadept/wirq/internal/proxy"
	"github.com/loadept/wirq/internal/server"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type App struct {
	ctx    context.Context
	config *config.Manager
	server *server.Manager
	proxy  *proxy.Manager
}

func NewApp(appName string) (*App, error) {
	path, err := configPath(appName)
	if err != nil {
		return nil, fmt.Errorf("could not resolve config path: %v", err)
	}

	return &App{
		config: config.New(path),
	}, nil
}

func configPath(appName string) (string, error) {
	dir, err := os.UserConfigDir()
	if err != nil {
		return "", fmt.Errorf("could not resolve user config dir: %w", err)
	}

	appDir := filepath.Join(dir, appName)
	if err := os.MkdirAll(appDir, 0o700); err != nil {
		return "", fmt.Errorf("could not create config dir: %w", err)
	}

	return filepath.Join(appDir, "config.json"), nil
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	a.server = server.New(ctx)
}

func (a *App) shutdown(_ context.Context) {
	a.server.Stop()
}

func (a *App) LoadConfig() (*config.ConfigDTO, error) {
	return a.config.Read()
}

func (a *App) SaveConfig(cfg *config.ConfigDTO) error {
	return a.config.Write(cfg)
}

func (a *App) SelectCertFile() (string, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("could not resolve user home dir: %w", err)
	}

	path, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title:            "Select certificate file",
		DefaultDirectory: homeDir,
		Filters: []runtime.FileFilter{
			{DisplayName: "PEM Files (*.pem)", Pattern: "*.pem"},
		},
	})
	if err != nil {
		return "", err
	}

	return path, nil
}

func (a *App) StartServer(cfg *config.ConfigDTO) error {
	certs, err := tls.LoadX509KeyPair(cfg.CertPath, cfg.CertKeyPath)
	if err != nil {
		return fmt.Errorf("could not load certificates: %w", err)
	}

	if a.proxy == nil {
		a.proxy = proxy.New(a.ctx, &certs)
	} else {
		a.proxy.SetCA(&certs)
	}
	addr := fmt.Sprintf("%s:%d", cfg.ServerHost, cfg.ServerPort)
	if err := a.server.Start(addr, a.proxy.Handler()); err != nil {
		return err
	}

	return nil
}

func (a *App) StopServer() error {
	return a.server.Stop()
}

func (a *App) GetLogDetail(logID int64) *proxy.LogEntry {
	if a.proxy == nil {
		return nil
	}

	return a.proxy.GetLog(logID)
}

func (a *App) ExportLogs(logIDs []int64, filename string) (string, error) {
	if a.proxy == nil {
		return "", errors.New("proxy not started")
	}

	homeDir, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("could not resolve user home dir: %w", err)
	}

	path, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:            "Export logs",
		DefaultFilename:  filename,
		DefaultDirectory: homeDir,
		Filters: []runtime.FileFilter{
			{DisplayName: "JSON Files (*.json)", Pattern: "*.json"},
		},
	})
	if err != nil {
		return "", err
	}
	if path == "" {
		return "", nil
	}

	logs, err := a.proxy.GetLogs(logIDs)
	if err != nil {
		return "", err
	}

	file, err := os.OpenFile(path, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, 0o644)
	if err != nil {
		return "", err
	}
	defer file.Close()

	enc := json.NewEncoder(file)
	enc.SetIndent("", "  ")
	if err := enc.Encode(logs); err != nil {
		return "", err
	}
	return path, nil
}

func (a *App) ClearLogs() {
	if a.proxy == nil {
		return
	}

	a.proxy.ClearLogs()
}
