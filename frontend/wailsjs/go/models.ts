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

