package server

import (
	"context"
	"errors"
	"fmt"
	"net"
	"net/http"
	"sync"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type Manager struct {
	mu     sync.Mutex
	server *http.Server
	ctx    context.Context
}

func New(ctx context.Context) *Manager {
	return &Manager{ctx: ctx}
}

func (m *Manager) Start(addr string, handler http.Handler) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.server != nil {
		return errors.New("server is already running")
	}

	ln, err := (&net.ListenConfig{}).Listen(m.ctx, "tcp", addr)
	if err != nil {
		return fmt.Errorf("could not bind to %s: %w", addr, err)
	}

	m.server = &http.Server{
		Addr:         addr,
		Handler:      handler,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func(ctx context.Context, listener net.Listener) {
		err := m.server.Serve(listener)
		if err != nil && !errors.Is(err, http.ErrServerClosed) {
			runtime.EventsEmit(ctx, "proxy:error", err.Error())
			m.mu.Lock()
			m.server = nil
			m.mu.Unlock()
		}
	}(m.ctx, ln)
	return nil
}

func (m *Manager) Stop() error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.server == nil {
		return errors.New("server is not running")
	}

	shutCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := m.server.Shutdown(shutCtx); err != nil {
		return fmt.Errorf("could not stop server: %w", err)
	}
	m.server = nil
	return nil
}
