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
	"time"

	"github.com/andybalholm/brotli"
	"github.com/klauspost/compress/zstd"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

const maxBodySize = 10 * 1024

type Proxy struct {
	ca     *tls.Certificate
	client *http.Client
	certs  map[string]*tls.Certificate
	mu     sync.RWMutex
	appCtx context.Context
}

func New(ca *tls.Certificate, appCtx context.Context) *Proxy {
	return &Proxy{
		ca:     ca,
		client: &http.Client{Timeout: 10 * time.Second},
		certs:  make(map[string]*tls.Certificate),
		appCtx: appCtx,
	}
}

func (p *Proxy) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodConnect {
		host, _, err := net.SplitHostPort(r.Host)
		if err != nil {
			host = r.Host
		}

		destTLS, err := tls.Dial("tcp", r.Host, &tls.Config{
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

		cert, err := p.cachedCert(host)
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

		var bufReq bytes.Buffer
		req.Body = io.NopCloser(io.TeeReader(req.Body, &bufReq))
		if err := req.Write(destTLS); err != nil {
			return
		}

		res, err := http.ReadResponse(bufio.NewReader(destTLS), req)
		if err != nil {
			return
		}
		defer res.Body.Close()

		var bufRes bytes.Buffer
		res.Body = io.NopCloser(io.TeeReader(res.Body, &bufRes))
		if err := res.Write(clientTLS); err != nil {
			return
		}

		reqLog := requestLog{
			Host:    req.Host,
			Method:  req.Method,
			URL:     req.URL.String(),
			Proto:   req.Proto,
			Headers: req.Header,
			TLS:     true,
		}
		respLog := responseLog{
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
			bodyBytes := p.decompress(res.Header.Get("Content-Encoding"), &bufRes)
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

		runtime.EventsEmit(p.appCtx, "proxy:log", Log{reqLog, respLog})
		return
	}
	req, err := http.NewRequest(r.Method, r.URL.String(), r.Body)
	if err != nil {
		http.Error(w, "error creating request", http.StatusBadGateway)
		return
	}
	maps.Copy(req.Header, r.Header)

	var bufReq bytes.Buffer
	req.Body = io.NopCloser(io.TeeReader(r.Body, &bufReq))

	res, err := p.client.Do(req)
	if err != nil {
		http.Error(w, "proxy error", http.StatusBadGateway)
		return
	}
	defer res.Body.Close()
	maps.Copy(w.Header(), res.Header)

	var bufRes bytes.Buffer
	res.Body = io.NopCloser(io.TeeReader(res.Body, &bufRes))

	w.WriteHeader(res.StatusCode)
	io.Copy(w, res.Body)

	reqLog := requestLog{
		Host:    req.Host,
		Method:  req.Method,
		URL:     req.URL.String(),
		Proto:   req.Proto,
		Headers: req.Header,
		TLS:     false,
	}
	respLog := responseLog{
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
		bodyBytes := p.decompress(res.Header.Get("Content-Encoding"), &bufRes)
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

	runtime.EventsEmit(p.appCtx, "proxy:log", Log{reqLog, respLog})
}

func (p *Proxy) decompress(encoding string, buf *bytes.Buffer) []byte {
	var bodyBytes []byte
	switch {
	case strings.Contains(encoding, "gzip"):
		decoder, err := gzip.NewReader(buf)
		if err == nil {
			var bufUncompress bytes.Buffer
			_, errCopy := io.Copy(&bufUncompress, decoder)
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
		_, errCopy := io.Copy(&bufUncompress, decoder)
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
			if _, errCopy := io.Copy(&bufUncompress, decoder); errCopy == nil {
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

func (p *Proxy) cachedCert(host string) (*tls.Certificate, error) {
	p.mu.RLock()
	cert, ok := p.certs[host]
	p.mu.RUnlock()
	if ok {
		return cert, nil
	}

	cert, err := GenerateCert(p.ca, host)
	if err != nil {
		return nil, err
	}

	p.mu.Lock()
	defer p.mu.Unlock()
	if cert, ok := p.certs[host]; ok {
		return cert, nil
	}
	p.certs[host] = cert
	return cert, nil
}
