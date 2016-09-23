const globalObject: any = (function (): any {
	if (typeof window !== 'undefined') {
		// Browsers
		return window;
	}
	else if (typeof global !== 'undefined') {
		// Node
		return global;
	}
	else if (typeof self !== 'undefined') {
		// Web workers
		return self;
	}
	return {};
})();

export default globalObject;
