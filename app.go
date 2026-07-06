package main

import (
	"context"
	"crypto/tls"
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
	server *server.Manager
	config *config.Manager
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

	handler := proxy.New(&certs, a.ctx)
	addr := fmt.Sprintf("%s:%d", cfg.ServerHost, cfg.ServerPort)

	return a.server.Start(addr, handler)
}

func (a *App) StopServer() error {
	return a.server.Stop()
}
