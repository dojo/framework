intern.registerLoader((options) => {
	return intern.loadScript('node_modules/@dojo/loader/loader.js')
		.then(() => intern.loadScript('./_build/src/util/amd.js'))
		.then(() => {
			(<any> require).config(shimAmdDependencies({
				baseUrl: options.baseUrl || intern.config.basePath,
				packages: []
			}));

			return (modules: string[]) => {
				return new Promise<void>((resolve, reject) => {
					(<any> require)(modules, () => resolve());
				});
			};
		});
});
