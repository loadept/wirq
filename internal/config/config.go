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

	file, err := os.OpenFile(m.path, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0o600)
	if err != nil {
		return fmt.Errorf("could not open %s for writing: %w", m.path, err)
	}
	defer file.Close()

	confBytes, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		return fmt.Errorf("could not serialize config: %w", err)
	}

	bytesWritten, err := file.Write(confBytes)
	if err != nil {
		return fmt.Errorf("could not write to %s: %w", m.path, err)
	}
	if bytesWritten != len(confBytes) {
		return fmt.Errorf("incomplete write to %s: wrote %d of %d bytes", m.path, bytesWritten, len(confBytes))
	}

	return nil
}

func (m *Manager) Read() (ConfigDTO, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	content, err := os.ReadFile(m.path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return ConfigDTO{}, nil
		}
		return ConfigDTO{}, fmt.Errorf("could not read %s: %w", m.path, err)
	}
	if len(content) == 0 {
		return ConfigDTO{}, nil
	}

	var cfg fileConfig
	if err := json.Unmarshal(content, &cfg); err != nil {
		return ConfigDTO{}, err
	}

	data := ConfigDTO{
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
