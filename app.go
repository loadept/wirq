package main

import (
	"context"
	"crypto/tls"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"proxy/internal/config"
	"proxy/internal/proxy"
	"proxy/internal/server"
)

type App struct {
	ctx    context.Context
	server *server.Manager
	config *config.Manager
}

func NewApp(appName string) *App {
	path, err := configPath(appName)
	if err != nil {
		log.Fatalf("could not resolve config path: %v", err)
	}

	return &App{
		config: config.New(path),
	}
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

func (a *App) LoadConfig() (config.ConfigDTO, error) {
	return a.config.Read()
}

func (a *App) SaveConfig(cfg *config.ConfigDTO) error {
	return a.config.Write(cfg)
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
