intern.registerPlugin('has', () => {
	const DojoHasEnvironment = {
		staticFeatures: {
			test: true
		}
	};
	if (typeof global !== 'undefined') {
		(global as any).DojoHasEnvironment = DojoHasEnvironment;
	}

	if (typeof self !== 'undefined') {
		(self as any).DojoHasEnvironment = DojoHasEnvironment;
	}

	if (typeof window !== 'undefined') {
		(window as any).DojoHasEnvironment = DojoHasEnvironment;
	}
});
