// Package proxy implements the MITM HTTP/HTTPS proxy core.
//
// For plain HTTP requests it forwards traffic transparently. For HTTPS it
// handles the CONNECT method: hijacks the client connection, presents a
// dynamically generated TLS certificate signed by a user-provided CA, and
// relays decrypted traffic to the destination.
//
// Every intercepted transaction is stored in an in-memory log bounded at 1000
// entries (older entries are evicted). A [LogSummary] (without bodies) is
// emitted to the Wails frontend via "proxy:log" events; the full [LogEntry] is
// fetched on demand via [Manager.GetLog].
//
// Response bodies are decompressed transparently (gzip, brotli, zstd) and
// large text bodies are truncated at 10 KB.
package proxy
