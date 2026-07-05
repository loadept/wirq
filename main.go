package main

import (
	"embed"
	"fmt"
	"log"
	"os"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

//go:embed all:frontend/dist
var assets embed.FS

const appName = "wirq"

var version = "dev"

func main() {
	fmt.Fprintf(os.Stdout, "wirq version: %s\n", version)

	app, err := NewApp(appName)
	if err != nil {
		log.Fatalf("failed to start application: %v", err)
	}

	err = wails.Run(&options.App{
		Title:     appName,
		Width:     1280,
		Height:    800,
		MinWidth:  1024,
		MinHeight: 768,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		OnStartup:        app.startup,
		OnShutdown:       app.shutdown,
		Bind: []any{
			app,
		},
	})
	if err != nil {
		log.Fatalf("failed to run wails: %v", err)
	}
}
