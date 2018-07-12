function addIfNotPresent(packages: any[], newPackage: any) {
	if (packages.some((pack) => pack.name === newPackage.name)) {
		return;
	}

	packages.push(newPackage);
}

// tslint:disable-next-line
function shimAmdDependencies(config: any) {
	let packages = config.packages || [];

	addIfNotPresent(packages, {
		name: 'tslib',
		location: 'node_modules/tslib',
		main: 'tslib'
	});

	addIfNotPresent(packages, {
		name: 'pepjs',
		location: 'node_modules/pepjs/dist',
		main: 'pep'
	});

	addIfNotPresent(packages, {
		name: 'intersection-observer',
		location: 'node_modules/intersection-observer',
		main: 'intersection-observer'
	});

	addIfNotPresent(packages, {
		name: 'web-animations-js',
		location: 'node_modules/web-animations-js'
	});

	addIfNotPresent(packages, {
		name: '@dojo',
		location: 'node_modules/@dojo'
	});

	config.packages = packages;

	return config;
}
