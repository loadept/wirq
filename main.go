package main

import (
	"embed"
	"flag"
	"fmt"
	"log"
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

func main() {
	var versionFlag bool
	flag.BoolVar(&versionFlag, "version", false, "Show application version")
	flag.Parse()

	if versionFlag {
		fmt.Fprintf(os.Stdout, "%s %s\n", AppName, Version)
		os.Exit(0)
	}

	app, err := NewApp(AppName)
	if err != nil {
		log.Fatalf("failed to start application: %v", err)
	}

	opts := &options.App{
		Title:            AppName,
		MinWidth:         1280,
		MinHeight:        800,
		StartHidden:      true,
		AssetServer:      &assetserver.Options{Assets: assets},
		BackgroundColour: &options.RGBA{R: 26, G: 26, B: 26, A: 1},
		OnStartup:        app.startup,
		OnShutdown:       app.shutdown,
		SingleInstanceLock: &options.SingleInstanceLock{
			UniqueId: AppID,
			OnSecondInstanceLaunch: func(options.SecondInstanceData) {
				runtime.WindowUnminimise(app.ctx)
				runtime.Show(app.ctx)
			},
		},
		Bind: []any{
			app,
		},
	}
	if err := wails.Run(opts); err != nil {
		log.Fatalf("failed to run wails: %v", err)
	}
}
