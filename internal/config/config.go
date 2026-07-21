package config

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sync"
)

type ConfigDTO struct {
	CertPath    string `json:"certPath"`
	CertKeyPath string `json:"certKeyPath"`
	ServerHost  string `json:"serverHost"`
	ServerPort  int    `json:"serverPort"`
	Appearance  string `json:"appearance"`
}

type fileConfig struct {
	CertAuthority certAuthorityConfig `json:"certAuthority"`
	Server        serverConfig        `json:"server"`
	General       generalConfig       `json:"general"`
}

type certAuthorityConfig struct {
	CertPath    string `json:"certPath"`
	CertKeyPath string `json:"certKeyPath"`
}

type generalConfig struct {
	Appearance string `json:"appearance"`
}

type serverConfig struct {
	Host string `json:"host"`
	Port int    `json:"port"`
}

type Manager struct {
	path string
	mu   sync.RWMutex
}

func New(path string) *Manager {
	return &Manager{
		path: path,
	}
}

func (m *Manager) Write(cfg *ConfigDTO) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	cleanedCertPath, err := validateFilePath(cfg.CertPath, "certificate")
	if err != nil {
		return err
	}
	cleanedKeyPath, err := validateFilePath(cfg.CertKeyPath, "certificate key")
	if err != nil {
		return err
	}
	if err := validateAddr(cfg.ServerHost, cfg.ServerPort); err != nil {
		return err
	}

	config := &fileConfig{
		CertAuthority: certAuthorityConfig{
			CertPath:    cleanedCertPath,
			CertKeyPath: cleanedKeyPath,
		},
		Server: serverConfig{
			Host: cfg.ServerHost,
			Port: cfg.ServerPort,
		},
		General: generalConfig{
			Appearance: cfg.Appearance,
		},
	}

	confBytes, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		return fmt.Errorf("could not serialize config: %w", err)
	}

	dir := filepath.Dir(m.path)
	tmpFile, err := os.CreateTemp(dir, "config.*.tmp")
	if err != nil {
		return fmt.Errorf("could not create temp file: %w", err)
	}
	tmpPath := tmpFile.Name()

	if _, err := tmpFile.Write(confBytes); err != nil {
		tmpFile.Close()
		os.Remove(tmpPath)
		return fmt.Errorf("could not write temp file: %w", err)
	}
	if err := tmpFile.Close(); err != nil {
		os.Remove(tmpPath)
		return fmt.Errorf("could not close temp file: %w", err)
	}

	if err := os.Rename(tmpPath, m.path); err != nil {
		os.Remove(tmpPath)
		return fmt.Errorf("could not rename temp file: %w", err)
	}

	return nil
}

func defaultConfig() *ConfigDTO {
	return &ConfigDTO{
		ServerHost: "127.0.0.1",
		ServerPort: 3100,
		Appearance: "dark",
	}
}

func (m *Manager) Read() (*ConfigDTO, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	content, err := os.ReadFile(m.path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return defaultConfig(), nil
		}
		return nil, fmt.Errorf("could not read %s: %w", m.path, err)
	}
	if len(content) == 0 {
		return defaultConfig(), nil
	}

	var cfg fileConfig
	if err := json.Unmarshal(content, &cfg); err != nil {
		return nil, fmt.Errorf("could not parse config: %w", err)
	}

	data := &ConfigDTO{
		CertPath:    cfg.CertAuthority.CertPath,
		CertKeyPath: cfg.CertAuthority.CertKeyPath,
		ServerHost:  cfg.Server.Host,
		ServerPort:  cfg.Server.Port,
		Appearance:  cfg.General.Appearance,
	}
	return data, nil
}

func validateFilePath(path, label string) (string, error) {
	if !filepath.IsAbs(path) {
		return "", fmt.Errorf("%s must be an absolute path, got %q", label, path)
	}

	cleaned := filepath.Clean(path)
	info, err := os.Stat(cleaned)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return "", fmt.Errorf("%s not found at %q", label, cleaned)
		}
		return "", fmt.Errorf("could not access %s at %q: %w", label, cleaned, err)
	}
	if info.IsDir() {
		return "", fmt.Errorf("%s must be a file, but %q is a directory", label, cleaned)
	}

	return cleaned, nil
}

func validateAddr(host string, port int) error {
	if port < 1 || port > 65535 {
		return fmt.Errorf("invalid port: %d", port)
	}

	if host == "" {
		return errors.New("host cannot be empty")
	}

	return nil
}
