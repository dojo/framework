const globalObject: any = (function(): any {
	// the only reliable means to get the global object is
	// `Function('return this')()`
	// However, this causes CSP violations in Chrome apps.
	if (typeof window !== 'undefined' && window.navigator.userAgent.indexOf('jsdom') > -1) {
		return window;
	}
	if (typeof globalThis !== 'undefined') {
		return globalThis;
	}
	if (typeof self !== 'undefined') {
		return self;
	}
	if (typeof window !== 'undefined') {
		return window;
	}
	if (typeof global !== 'undefined') {
		return global;
	}
})();

export default globalObject;
