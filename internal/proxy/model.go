package proxy

type RequestLog struct {
	Host     string              `json:"host"`
	Method   string              `json:"method"`
	URL      string              `json:"url"`
	Proto    string              `json:"proto"`
	Headers  map[string][]string `json:"headers"`
	TLS      bool                `json:"tls"`
	Body     any                 `json:"body"`
	IsBase64 bool                `json:"isBase64"`
}

type ResponseLog struct {
	Proto      string              `json:"proto"`
	StatusCode int                 `json:"statusCode"`
	Headers    map[string][]string `json:"headers"`
	Body       any                 `json:"body"`
	IsBase64   bool                `json:"isBase64"`
}

type LogEntry struct {
	ID       int64       `json:"id"`
	Request  RequestLog  `json:"request"`
	Response ResponseLog `json:"response"`
}

type LogSummary struct {
	ID         int64  `json:"id"`
	Host       string `json:"host"`
	Method     string `json:"method"`
	URL        string `json:"url"`
	Proto      string `json:"proto"`
	StatusCode int    `json:"statusCode"`
	TLS        bool   `json:"tls"`
}
