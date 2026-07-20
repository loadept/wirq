package config

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNew(t *testing.T) {
	m := New("/tmp/test-config.json")
	assert.Equal(t, "/tmp/test-config.json", m.path)
}

func TestDefaultConfig(t *testing.T) {
	cfg := defaultConfig()
	assert.Equal(t, "127.0.0.1", cfg.ServerHost)
	assert.Equal(t, 3100, cfg.ServerPort)
	assert.Equal(t, "dark", cfg.Appearance)
}

func TestValidateAddr(t *testing.T) {
	tests := []struct {
		name    string
		host    string
		port    int
		wantErr bool
	}{
		{"valid", "127.0.0.1", 3100, false},
		{"valid port 1", "0.0.0.0", 1, false},
		{"valid port 65535", "localhost", 65535, false},
		{"empty host", "", 3100, true},
		{"port zero", "127.0.0.1", 0, true},
		{"port negative", "127.0.0.1", -1, true},
		{"port too high", "127.0.0.1", 65536, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateAddr(tt.host, tt.port)
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestValidateFilePath(t *testing.T) {
	dir := t.TempDir()

	validFile := filepath.Join(dir, "cert.pem")
	require.NoError(t, os.WriteFile(validFile, []byte("data"), 0o644))

	subdir := filepath.Join(dir, "sub")
	require.NoError(t, os.MkdirAll(subdir, 0o700))

	tests := []struct {
		name    string
		path    string
		label   string
		wantErr bool
	}{
		{"relative path", "cert.pem", "certificate", true},
		{"missing file", filepath.Join(dir, "nope.pem"), "certificate", true},
		{"is directory", subdir, "certificate", true},
		{"valid file", validFile, "certificate", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cleaned, err := validateFilePath(tt.path, tt.label)
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, filepath.Clean(tt.path), cleaned)
			}
		})
	}
}

func TestWriteAndRead(t *testing.T) {
	dir := t.TempDir()

	certFile := filepath.Join(dir, "rootCA.pem")
	keyFile := filepath.Join(dir, "rootCA-key.pem")
	require.NoError(t, os.WriteFile(certFile, []byte("cert-data"), 0o644))
	require.NoError(t, os.WriteFile(keyFile, []byte("key-data"), 0o644))

	cfgPath := filepath.Join(dir, "config.json")
	m := New(cfgPath)

	input := &ConfigDTO{
		CertPath:    certFile,
		CertKeyPath: keyFile,
		ServerHost:  "0.0.0.0",
		ServerPort:  8080,
		Appearance:  "light",
	}

	require.NoError(t, m.Write(input))

	got, err := m.Read()
	require.NoError(t, err)
	assert.Equal(t, input.CertPath, got.CertPath)
	assert.Equal(t, input.CertKeyPath, got.CertKeyPath)
	assert.Equal(t, input.ServerHost, got.ServerHost)
	assert.Equal(t, input.ServerPort, got.ServerPort)
	assert.Equal(t, input.Appearance, got.Appearance)
}

func TestRead_MissingFile(t *testing.T) {
	m := New(filepath.Join(t.TempDir(), "nonexistent.json"))
	cfg, err := m.Read()
	require.NoError(t, err)
	assert.Equal(t, defaultConfig(), cfg)
}

func TestRead_EmptyFile(t *testing.T) {
	cfgPath := filepath.Join(t.TempDir(), "empty.json")
	require.NoError(t, os.WriteFile(cfgPath, []byte{}, 0o644))

	m := New(cfgPath)
	cfg, err := m.Read()
	require.NoError(t, err)
	assert.Equal(t, defaultConfig(), cfg)
}

func TestRead_InvalidJSON(t *testing.T) {
	cfgPath := filepath.Join(t.TempDir(), "bad.json")
	require.NoError(t, os.WriteFile(cfgPath, []byte("{invalid"), 0o644))

	m := New(cfgPath)
	_, err := m.Read()
	assert.Error(t, err)
}

func TestRead_PartialJSON(t *testing.T) {
	tests := []struct {
		name string
		data string
	}{
		{"missing closing brace", `{"server_host": "127.0.0.1"`},
		{"missing value", `{"server_host":`},
		{"trailing comma", `{"server_host": "127.0.0.1",}`},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cfgPath := filepath.Join(t.TempDir(), "partial.json")
			require.NoError(t, os.WriteFile(cfgPath, []byte(tt.data), 0o644))

			m := New(cfgPath)
			_, err := m.Read()
			assert.Error(t, err, "partial/malformed JSON should fail: %s", tt.data)
		})
	}
}

func TestRead_UnknownFieldsIgnored(t *testing.T) {
	cfgPath := filepath.Join(t.TempDir(), "extra.json")
	data := `{"unknown_field": true, "another": 123}`
	require.NoError(t, os.WriteFile(cfgPath, []byte(data), 0o644))

	m := New(cfgPath)
	cfg, err := m.Read()
	require.NoError(t, err, "unknown fields should be silently ignored by json.Unmarshal")
	assert.Equal(t, &ConfigDTO{}, cfg, "unknown fields produce zero-valued DTO (no matching fileConfig fields)")
}

func TestRead_WrongTypes(t *testing.T) {
	tests := []struct {
		name    string
		data    string
		wantErr bool
	}{
		{"number into string", `{"server": {"host": 12345}}`, true},
		{"string into int", `{"server": {"port": "not-a-number"}}`, true},
		{"bool into string", `{"general": {"appearance": true}}`, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cfgPath := filepath.Join(t.TempDir(), "wrongtype.json")
			require.NoError(t, os.WriteFile(cfgPath, []byte(tt.data), 0o644))

			m := New(cfgPath)
			_, err := m.Read()
			if tt.wantErr {
				assert.Error(t, err, "json.Unmarshal rejects type mismatches in typed structs")
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestWrite_ReadOnlyDir(t *testing.T) {
	dir := t.TempDir()

	// create a subdirectory and make it read-only
	subdir := filepath.Join(dir, "readonly")
	require.NoError(t, os.MkdirAll(subdir, 0o755))
	require.NoError(t, os.Chmod(subdir, 0o444))
	defer os.Chmod(subdir, 0o755) // restore for cleanup

	cfgPath := filepath.Join(subdir, "config.json")
	m := New(cfgPath)

	err := m.Write(&ConfigDTO{
		CertPath:    "/dev/null",
		CertKeyPath: "/dev/null",
		ServerHost:  "127.0.0.1",
		ServerPort:  3100,
	})
	assert.Error(t, err, "writing to read-only directory should fail")
}

func TestWrite_TempFileNotLeaked(t *testing.T) {
	dir := t.TempDir()

	certFile := filepath.Join(dir, "cert.pem")
	keyFile := filepath.Join(dir, "key.pem")
	require.NoError(t, os.WriteFile(certFile, []byte("c"), 0o644))
	require.NoError(t, os.WriteFile(keyFile, []byte("k"), 0o644))

	cfgPath := filepath.Join(dir, "config.json")
	m := New(cfgPath)

	require.NoError(t, m.Write(&ConfigDTO{
		CertPath:    certFile,
		CertKeyPath: keyFile,
		ServerHost:  "127.0.0.1",
		ServerPort:  3100,
	}))

	// no .tmp files should remain
	entries, err := os.ReadDir(dir)
	require.NoError(t, err)
	for _, e := range entries {
		assert.False(t, filepath.Ext(e.Name()) == ".tmp", "temp file leaked: %s", e.Name())
	}
}

func TestWrite_InvalidCertPath(t *testing.T) {
	m := New(filepath.Join(t.TempDir(), "config.json"))
	err := m.Write(&ConfigDTO{
		CertPath:    "relative/path.pem",
		CertKeyPath: "/nonexistent/key.pem",
		ServerHost:  "127.0.0.1",
		ServerPort:  3100,
	})
	assert.Error(t, err)
}

func TestWrite_InvalidAddr(t *testing.T) {
	dir := t.TempDir()
	certFile := filepath.Join(dir, "cert.pem")
	keyFile := filepath.Join(dir, "key.pem")
	require.NoError(t, os.WriteFile(certFile, []byte("c"), 0o644))
	require.NoError(t, os.WriteFile(keyFile, []byte("k"), 0o644))

	m := New(filepath.Join(dir, "config.json"))
	err := m.Write(&ConfigDTO{
		CertPath:    certFile,
		CertKeyPath: keyFile,
		ServerHost:  "",
		ServerPort:  99999,
	})
	assert.Error(t, err)
}
