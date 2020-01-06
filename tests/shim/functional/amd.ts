const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import pollUntil from '@theintern/leadfoot/helpers/pollUntil';

registerSuite('AMD Util', {
	async 'Utility injects dependencies if they are not present'(test) {
		if (this.remote.environmentType && this.remote.environmentType.browserName === 'chrome') {
			test.skip();
		}
		return this.remote
			.get(
				`${__dirname}/amd.html?q=${encodeURIComponent(
					JSON.stringify({
						packages: [{ name: 'existingPackage', location: 'some-location' }]
					})
				)}`
			)
			.then(
				pollUntil(
					function() {
						return (<any>window).config;
					},
					undefined,
					5000
				),
				undefined
			)
			.then((config: any) => {
				assert.lengthOf(config.packages, 8);
				assert.lengthOf(config.packages.filter((p: any) => p.name === 'pepjs'), 1);
				assert.lengthOf(config.packages.filter((p: any) => p.name === 'wicg-inert'), 1);
				assert.lengthOf(config.packages.filter((p: any) => p.name === 'tslib'), 1);
				assert.lengthOf(config.packages.filter((p: any) => p.name === 'intersection-observer'), 1);
				assert.lengthOf(config.packages.filter((p: any) => p.name === '@dojo'), 1);
				assert.lengthOf(config.packages.filter((p: any) => p.name === 'existingPackage'), 1);
				assert.lengthOf(config.packages.filter((p: any) => p.name === 'web-animations-js'), 1);
				assert.lengthOf(config.packages.filter((p: any) => p.name === 'resize-observer-polyfill'), 1);
			});
	},
	async 'Utility does not inject dependency if it already exists'(test) {
		if (this.remote.environmentType && this.remote.environmentType.browserName === 'chrome') {
			test.skip();
		}
		return this.remote
			.get(
				`${__dirname}/amd.html?q=` +
					encodeURIComponent(
						JSON.stringify({
							packages: [{ name: 'pepjs', location: 'some-location' }]
						})
					)
			)
			.then(
				pollUntil(
					function() {
						return (<any>window).config;
					},
					undefined,
					5000
				),
				undefined
			)
			.then((config: any) => {
				const pepjs = config.packages.filter((p: any) => p.name === 'pepjs');

				assert.lengthOf(pepjs, 1);
				assert.equal(pepjs[0].location, 'some-location');
			});
	}
});
