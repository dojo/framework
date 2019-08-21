const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import pollUntil from '@theintern/leadfoot/helpers/pollUntil';

interface CallbackResults {
	intersectionObserver: boolean;
	pointerEvents: boolean;
}

registerSuite('Polyfills', {
	Polyfills(test) {
		if (this.remote.environmentType && this.remote.environmentType.browserName === 'chrome') {
			test.skip();
		}
		return this.remote
			.get(`${__dirname}/polyfills.html`)
			.then(
				pollUntil<{ pointerEvents: boolean; intersectionObserver: boolean }>(
					function() {
						return (<any>window).results;
					},
					undefined,
					5000
				),
				undefined
			)
			.then((results: CallbackResults) => {
				assert.isTrue(results.pointerEvents, 'Expected pointer events to be available');
				assert.isTrue(results.intersectionObserver, 'Expected intersection observer to be available');
			});
	}
});
