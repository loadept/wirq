export namespace config {
	
	export class ConfigDTO {
	    certPath: string;
	    certKeyPath: string;
	    serverHost: string;
	    serverPort: number;
	    appearance: string;
	
	    static createFrom(source: any = {}) {
	        return new ConfigDTO(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.certPath = source["certPath"];
	        this.certKeyPath = source["certKeyPath"];
	        this.serverHost = source["serverHost"];
	        this.serverPort = source["serverPort"];
	        this.appearance = source["appearance"];
	    }
	}

}

export namespace proxy {
	
	export class ResponseLog {
	    proto: string;
	    statusCode: number;
	    headers: Record<string, Array<string>>;
	    body: any;
	    isBase64: boolean;
	
	    static createFrom(source: any = {}) {
	        return new ResponseLog(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.proto = source["proto"];
	        this.statusCode = source["statusCode"];
	        this.headers = source["headers"];
	        this.body = source["body"];
	        this.isBase64 = source["isBase64"];
	    }
	}
	export class RequestLog {
	    host: string;
	    method: string;
	    url: string;
	    proto: string;
	    headers: Record<string, Array<string>>;
	    tls: boolean;
	    body: any;
	    isBase64: boolean;
	
	    static createFrom(source: any = {}) {
	        return new RequestLog(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.host = source["host"];
	        this.method = source["method"];
	        this.url = source["url"];
	        this.proto = source["proto"];
	        this.headers = source["headers"];
	        this.tls = source["tls"];
	        this.body = source["body"];
	        this.isBase64 = source["isBase64"];
	    }
	}
	export class LogEntry {
	    id: number;
	    request: RequestLog;
	    response: ResponseLog;
	
	    static createFrom(source: any = {}) {
	        return new LogEntry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.request = this.convertValues(source["request"], RequestLog);
	        this.response = this.convertValues(source["response"], ResponseLog);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	

}

