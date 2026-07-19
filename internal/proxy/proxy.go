package proxy

import (
	"bufio"
	"bytes"
	"compress/gzip"
	"context"
	"crypto/tls"
	"encoding/base64"
	"encoding/json"
	"io"
	"maps"
	"net"
	"net/http"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/andybalholm/brotli"
	"github.com/klauspost/compress/zstd"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

const (
	maxBodySize = 10 * 1024
	maxLogs     = 1000
	maxReadSize = 10 * 1024 * 1024
)

type limitedBuf struct {
	buf   bytes.Buffer
	limit int
}

func (w *limitedBuf) Write(p []byte) (int, error) {
	if w.limit <= 0 || len(p) == 0 {
		return len(p), nil
	}
	if len(p) > w.limit {
		p = p[:w.limit]
	}
	n, _ := w.buf.Write(p)
	w.limit -= n
	return len(p), nil
}

func (w *limitedBuf) Len() int           { return w.buf.Len() }
func (w *limitedBuf) Bytes() []byte      { return w.buf.Bytes() }
func (w *limitedBuf) String() string     { return w.buf.String() }

type Manager struct {
	appCtx     context.Context
	httpClient *http.Client

	ca     *tls.Certificate
	certs  map[string]*tls.Certificate
	certMu sync.RWMutex

	counter atomic.Int64
	logs    []*LogEntry
	logMu   sync.RWMutex
}

func New(ctx context.Context, ca *tls.Certificate) *Manager {
	return &Manager{
		appCtx:     ctx,
		httpClient: &http.Client{Timeout: 10 * time.Second},
		ca:         ca,
		certs:      make(map[string]*tls.Certificate),
	}
}

func (m *Manager) Handler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := m.counter.Add(1)

		if r.Method == http.MethodConnect {
			host, _, err := net.SplitHostPort(r.Host)
			if err != nil {
				host = r.Host
			}

			destTLS, err := tls.DialWithDialer(&net.Dialer{
				Timeout: 10 * time.Second,
			}, "tcp", r.Host, &tls.Config{
				ServerName: host,
			})
			if err != nil {
				http.Error(w, "unable to connect to destination", http.StatusServiceUnavailable)
				return
			}
			defer destTLS.Close()

			w.WriteHeader(http.StatusOK)
			hijacker, ok := w.(http.Hijacker)
			if !ok {
				http.Error(w, "server does not support hijacking", http.StatusInternalServerError)
				return
			}

			conn, _, err := hijacker.Hijack()
			if err != nil {
				return
			}

			cert, err := m.cachedCert(host)
			if err != nil {
				conn.Close()
				return
			}
			clientTLS := tls.Server(conn, &tls.Config{
				Certificates: []tls.Certificate{*cert},
			})
			defer clientTLS.Close()

			if err := clientTLS.Handshake(); err != nil {
				return
			}

			req, err := http.ReadRequest(bufio.NewReader(clientTLS))
			if err != nil {
				return
			}
			defer req.Body.Close()

			bufReq := limitedBuf{limit: maxReadSize}
			req.Body = io.NopCloser(io.TeeReader(req.Body, &bufReq))
			if err := req.Write(destTLS); err != nil {
				return
			}

			res, err := http.ReadResponse(bufio.NewReader(destTLS), req)
			if err != nil {
				return
			}
			defer res.Body.Close()

			bufRes := limitedBuf{limit: maxReadSize}
			res.Body = io.NopCloser(io.TeeReader(res.Body, &bufRes))
			if err := res.Write(clientTLS); err != nil {
				return
			}

			reqLog := RequestLog{
				Host:    req.Host,
				Method:  req.Method,
				URL:     req.URL.String(),
				Proto:   req.Proto,
				Headers: req.Header,
				TLS:     true,
			}
			respLog := ResponseLog{
				Proto:      res.Proto,
				StatusCode: res.StatusCode,
				Headers:    res.Header,
			}
			reqContentType := req.Header.Get("Content-Type")
			if bufReq.Len() > 0 {
				switch {
				case strings.Contains(reqContentType, "application/json"):
					b := bufReq.Bytes()
					if json.Valid(b) {
						reqLog.Body = json.RawMessage(b)
						break
					}
					fallthrough
				case strings.Contains(reqContentType, "application/xml"):
					fallthrough
				case strings.Contains(reqContentType, "text/"):
					fallthrough
				case strings.Contains(reqContentType, "application/x-www-form-urlencoded"):
					reqLog.Body = bufReq.String()
				default:
					bodyEncoded := base64.StdEncoding.EncodeToString(bufReq.Bytes())
					reqLog.Body = bodyEncoded
					reqLog.IsBase64 = true
				}
			}
			respContentType := res.Header.Get("Content-Type")
			if bufRes.Len() > 0 {
				bodyBytes := m.decompress(res.Header.Get("Content-Encoding"), &bufRes.buf)
				switch {
				case strings.Contains(respContentType, "application/json"):
					if json.Valid(bodyBytes) {
						respLog.Body = json.RawMessage(bodyBytes)
					} else {
						respLog.Body = string(bodyBytes)
					}
				case strings.Contains(respContentType, "application/xml"):
					fallthrough
				case strings.Contains(respContentType, "text/"):
					if len(bodyBytes) > maxBodySize {
						respLog.Body = string(bodyBytes)[:maxBodySize] + " ...[truncate]"
					} else {
						respLog.Body = string(bodyBytes)
					}
				default:
					respLog.Body = base64.StdEncoding.EncodeToString(bodyBytes)
					respLog.IsBase64 = true
				}
			}

			log := &LogEntry{
				ID:       id,
				Request:  reqLog,
				Response: respLog,
			}
			summary := &LogSummary{
				ID:         id,
				Host:       req.Host,
				Method:     req.Method,
				URL:        req.URL.String(),
				Proto:      req.Proto,
				StatusCode: res.StatusCode,
				TLS:        true,
			}

			m.appendLog(log)
			runtime.EventsEmit(m.appCtx, "proxy:log", summary)
			return
		}
		req, err := http.NewRequest(r.Method, r.URL.String(), r.Body)
		if err != nil {
			http.Error(w, "error creating request", http.StatusBadGateway)
			return
		}
		maps.Copy(req.Header, r.Header)

		bufReq := limitedBuf{limit: maxReadSize}
		req.Body = io.NopCloser(io.TeeReader(r.Body, &bufReq))

		res, err := m.httpClient.Do(req)
		if err != nil {
			http.Error(w, "proxy error", http.StatusBadGateway)
			return
		}
		defer res.Body.Close()
		maps.Copy(w.Header(), res.Header)

		bufRes := limitedBuf{limit: maxReadSize}
		res.Body = io.NopCloser(io.TeeReader(res.Body, &bufRes))

		w.WriteHeader(res.StatusCode)
		io.Copy(w, res.Body)

		reqLog := RequestLog{
			Host:    req.Host,
			Method:  req.Method,
			URL:     req.URL.String(),
			Proto:   req.Proto,
			Headers: req.Header,
			TLS:     false,
		}
		respLog := ResponseLog{
			Proto:      res.Proto,
			StatusCode: res.StatusCode,
			Headers:    res.Header,
		}
		reqContentType := req.Header.Get("Content-Type")
		if bufReq.Len() > 0 {
			switch {
			case strings.Contains(reqContentType, "application/json"):
				b := bufReq.Bytes()
				if json.Valid(b) {
					reqLog.Body = json.RawMessage(b)
					break
				}
				fallthrough
			case strings.Contains(reqContentType, "application/xml"):
				fallthrough
			case strings.Contains(reqContentType, "text/"):
				fallthrough
			case strings.Contains(reqContentType, "application/x-www-form-urlencoded"):
				reqLog.Body = bufReq.String()
			default:
				bodyEncoded := base64.StdEncoding.EncodeToString(bufReq.Bytes())
				reqLog.Body = bodyEncoded
				reqLog.IsBase64 = true
			}
		}
		respContentType := res.Header.Get("Content-Type")
		if bufRes.Len() > 0 {
			bodyBytes := m.decompress(res.Header.Get("Content-Encoding"), &bufRes.buf)
			switch {
			case strings.Contains(respContentType, "application/json"):
				if json.Valid(bodyBytes) {
					respLog.Body = json.RawMessage(bodyBytes)
				} else {
					respLog.Body = string(bodyBytes)
				}
			case strings.Contains(respContentType, "application/xml"):
				fallthrough
			case strings.Contains(respContentType, "text/"):
				if len(bodyBytes) > maxBodySize {
					respLog.Body = string(bodyBytes)[:maxBodySize] + " ...[truncate]"
				} else {
					respLog.Body = string(bodyBytes)
				}
			default:
				respLog.Body = base64.StdEncoding.EncodeToString(bodyBytes)
				respLog.IsBase64 = true
			}
		}

		log := &LogEntry{
			ID:       id,
			Request:  reqLog,
			Response: respLog,
		}
		summary := &LogSummary{
			ID:         id,
			Host:       req.Host,
			Method:     req.Method,
			URL:        req.URL.String(),
			Proto:      req.Proto,
			StatusCode: res.StatusCode,
			TLS:        false,
		}

		m.appendLog(log)
		runtime.EventsEmit(m.appCtx, "proxy:log", summary)
	})
}

func (m *Manager) decompress(encoding string, buf *bytes.Buffer) []byte {
	var bodyBytes []byte
	switch {
	case strings.Contains(encoding, "gzip"):
		decoder, err := gzip.NewReader(buf)
		if err == nil {
			var bufUncompress bytes.Buffer
			_, errCopy := io.Copy(&bufUncompress, io.LimitReader(decoder, maxReadSize))
			if errCopy == nil {
				bodyBytes = bufUncompress.Bytes()
			}
			decoder.Close()
		}
		if len(bodyBytes) == 0 {
			bodyBytes = buf.Bytes()
		}
	case strings.Contains(encoding, "br"):
		decoder := brotli.NewReader(buf)
		var bufUncompress bytes.Buffer
		_, errCopy := io.Copy(&bufUncompress, io.LimitReader(decoder, maxReadSize))
		if errCopy == nil {
			bodyBytes = bufUncompress.Bytes()
		}
		if len(bodyBytes) == 0 {
			bodyBytes = buf.Bytes()
		}
	case strings.Contains(encoding, "zstd"):
		decoder, err := zstd.NewReader(buf)
		if err == nil {
			var bufUncompress bytes.Buffer
			if _, errCopy := io.Copy(&bufUncompress, io.LimitReader(decoder, maxReadSize)); errCopy == nil {
				bodyBytes = bufUncompress.Bytes()
			}
			decoder.Close()
		}
		if len(bodyBytes) == 0 {
			bodyBytes = buf.Bytes()
		}
	default:
		bodyBytes = buf.Bytes()
	}
	return bodyBytes
}

func (m *Manager) cachedCert(host string) (*tls.Certificate, error) {
	m.certMu.RLock()
	cert, ok := m.certs[host]
	m.certMu.RUnlock()
	if ok {
		return cert, nil
	}

	cert, err := GenerateCert(m.ca, host)
	if err != nil {
		return nil, err
	}

	m.certMu.Lock()
	defer m.certMu.Unlock()
	if cert, ok := m.certs[host]; ok {
		return cert, nil
	}
	m.certs[host] = cert
	return cert, nil
}

func (m *Manager) SetCA(ca *tls.Certificate) {
	m.certMu.Lock()
	defer m.certMu.Unlock()
	m.ca = ca
	m.certs = make(map[string]*tls.Certificate)
}

func (m *Manager) GetLog(id int64) *LogEntry {
	m.logMu.RLock()
	defer m.logMu.RUnlock()

	for i := range m.logs {
		if m.logs[i].ID == id {
			return m.logs[i]
		}
	}
	return nil
}

func (m *Manager) GetLogs(ids []int64) ([]*LogEntry, error) {
	m.logMu.RLock()
	defer m.logMu.RUnlock()

	set := make(map[int64]struct{}, len(ids))
	for _, id := range ids {
		set[id] = struct{}{}
	}

	result := make([]*LogEntry, 0, len(ids))
	for i := range m.logs {
		if _, ok := set[m.logs[i].ID]; ok {
			result = append(result, m.logs[i])
		}
	}
	return result, nil
}

func (m *Manager) ClearLogs() {
	m.logMu.Lock()
	defer m.logMu.Unlock()
	m.logs = nil
}

func (m *Manager) appendLog(log *LogEntry) {
	m.logMu.Lock()
	defer m.logMu.Unlock()

	m.logs = append(m.logs, log)
	if len(m.logs) > maxLogs {
		m.logs = m.logs[len(m.logs)-maxLogs:]
	}
}
