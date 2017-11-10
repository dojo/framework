const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import pollUntil from '@theintern/leadfoot/helpers/pollUntil';

interface CallbackResults {
	intersectionObserver: boolean;
	pointerEvents: boolean;
}

registerSuite('Polyfills', {
	'Polyfills'() {
		return this.remote
			.get('/_build/tests/functional/polyfills.html')
			.then(pollUntil(function () {
				return (<any> window).results;
			}, undefined, 5000), undefined)
			.then((results: CallbackResults) => {
				assert.isTrue(results.pointerEvents, 'Expected pointer events to be available');
				assert.isTrue(results.intersectionObserver, 'Expected intersection observer to be available');
			});
	}
});
