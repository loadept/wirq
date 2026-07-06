package main

import (
	"embed"
	"log/slog"
	"os"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

const (
	AppID   = "com.loadept.wirq"
	AppName = "wirq"
)

var Version = "dev"

//go:embed all:frontend/dist
var assets embed.FS

type appLogger struct {
	base *slog.Logger
}

func (l *appLogger) Print(msg string)   { l.base.Info(msg, "source", "wails") }
func (l *appLogger) Trace(msg string)   { l.base.Debug(msg, "source", "wails") }
func (l *appLogger) Debug(msg string)   { l.base.Debug(msg, "source", "wails") }
func (l *appLogger) Info(msg string)    { l.base.Info(msg, "source", "wails") }
func (l *appLogger) Warning(msg string) { l.base.Warn(msg, "source", "wails") }
func (l *appLogger) Error(msg string)   { l.base.Error(msg, "source", "wails") }
func (l *appLogger) Fatal(msg string) {
	l.base.Error(msg, "source", "wails", "fatal", true)
	os.Exit(1)
}

func main() {
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelDebug,
	}))
	slog.SetDefault(logger)

	slog.Info("welcome to wirq proxy", "version", Version)

	app, err := NewApp(AppName)
	if err != nil {
		slog.Error("failed to start application", "err", err)
		os.Exit(1)
	}

	opts := &options.App{
		Title:            AppName,
		Width:            1280,
		Height:           800,
		MinWidth:         1024,
		MinHeight:        768,
		StartHidden:      true,
		AssetServer:      &assetserver.Options{Assets: assets},
		BackgroundColour: &options.RGBA{R: 26, G: 26, B: 26, A: 1},
		OnStartup:        app.startup,
		OnShutdown:       app.shutdown,
		SingleInstanceLock: &options.SingleInstanceLock{
			UniqueId: AppID,
			OnSecondInstanceLaunch: func(data options.SecondInstanceData) {
				runtime.WindowUnminimise(app.ctx)
				runtime.Show(app.ctx)
			},
		},
		Bind: []any{
			app,
		},
		Logger: &appLogger{base: logger},
	}
	if err := wails.Run(opts); err != nil {
		slog.Error("failed to run wails", "err", err)
		os.Exit(1)
	}
}
