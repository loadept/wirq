// Package config manages persistent JSON configuration for the wirq proxy.
//
// On disk the config is stored as a nested structure (server.host, server.port,
// certAuthority.certPath, etc.). Callers interact with a flat [ConfigDTO] that
// the [Manager] translates on read and write. Writes are atomic: data goes to a
// temp file first, then gets renamed into place. All operations are safe for
// concurrent use.
package config
