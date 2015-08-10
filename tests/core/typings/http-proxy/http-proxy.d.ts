declare module 'http-proxy' {
	export class RoutingProxy {
		constructor(options?: {});
		proxyRequest(request:any, response:any, options: {}): void;
	}
}
