const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import pollUntil from '@theintern/leadfoot/helpers/pollUntil';

registerSuite('asyncAwait', () => {
	const poller = pollUntil<number>(
		function() {
			return (<any>window).callbackValue;
		},
		undefined,
		5000
	);

	return {
		async 'Async/Await with Bluebird'(test) {
			if (this.remote.environmentType && this.remote.environmentType.browserName === 'chrome') {
				test.skip();
			}
			const result: number = await this.remote.get(`${__dirname}/bluebird.html`).then(poller);

			assert.equal(result, 42);
		},

		async 'Async/Await with Dojo'(test) {
			if (this.remote.environmentType && this.remote.environmentType.browserName === 'chrome') {
				test.skip();
			}
			const result: number = await this.remote.get(`${__dirname}/asyncAwait.html`).then(poller);

			assert.equal(result, 42);
		},

		async 'Async/Await with Bluebird and Dojo'(test) {
			if (this.remote.environmentType && this.remote.environmentType.browserName === 'chrome') {
				test.skip();
			}
			const result: number = await this.remote.get(`${__dirname}/bluebirdAndDojo.html`).then(poller);

			assert.equal(result, 42);
		}
	};
});
