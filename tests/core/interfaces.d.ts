declare module 'intern/dojo/has!host-node?./services/echo' {
	const echo: any;
	export = echo;
}

declare module 'intern/dojo/node!http' {
	import http = require('http');
	export = http;
}

declare module 'intern/dojo/node!querystring' {
	import querystring = require('querystring');
	export = querystring;
}

declare module 'intern/dojo/node!formidable' {
	import formidable = require('formidable');
	export = formidable;
}

declare module 'intern/dojo/node!http-proxy' {
	import httpProxy = require('http-proxy');
	export = httpProxy;
}
