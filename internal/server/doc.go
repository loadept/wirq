// Package server manages the HTTP server lifecycle for the wirq proxy.
//
// A [Manager] wraps a single [net/http.Server] instance: call [Manager.Start]
// to bind an address and begin serving, and [Manager.Stop] to shut down
// gracefully with a 30-second timeout. Only one server can run at a time per
// manager.
//
// If the server fails unexpectedly (e.g. listener error), a "proxy:error" event
// is emitted to the Wails frontend and the internal state is reset so a new
// [Manager.Start] call can succeed.
package server
