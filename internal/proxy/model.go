package proxy

type requestLog struct {
	Host     string              `json:"host"`
	Method   string              `json:"method"`
	URL      string              `json:"url"`
	Proto    string              `json:"proto"`
	Headers  map[string][]string `json:"headers"`
	TLS      bool                `json:"tls"`
	Body     any                 `json:"body"`
	IsBase64 bool                `json:"isBase64"`
}

type responseLog struct {
	Proto      string              `json:"proto"`
	StatusCode int                 `json:"statusCode"`
	Headers    map[string][]string `json:"headers"`
	Body       any                 `json:"body"`
	IsBase64   bool                `json:"isBase64"`
}

type Log struct {
	Request  requestLog  `json:"request"`
	Response responseLog `json:"response"`
}
