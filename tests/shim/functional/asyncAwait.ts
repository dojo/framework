const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import pollUntil from '@theintern/leadfoot/helpers/pollUntil';

registerSuite('asyncAwait', {
	'Async/Await with Bluebird'() {
		return this.remote
			.get((<any> require).toUrl('./bluebird.html'))
			.then(pollUntil(function () {
				return (<any> window).callbackValue;
			}, undefined, 5000), undefined)
			.then((callbackValue: number) => {
				assert.equal(callbackValue, 42);
			});
	},

	'Async/Await with Dojo'() {
		return this.remote
			.get((<any> require).toUrl('./asyncAwait.html'))
			.then(pollUntil(function () {
				return (<any> window).callbackValue;
			}, undefined, 5000), undefined)
			.then((callbackValue: number) => {
				assert.equal(callbackValue, 42);
			});
	},

	'Async/Await with Bluebird and Dojo'() {
		return this.remote
			.get((<any> require).toUrl('./bluebirdAndDojo.html'))
			.then(pollUntil(function () {
				return (<any> window).callbackValue;
			}, undefined, 5000), undefined)
			.then((callbackValue: number) => {
				assert.equal(callbackValue, 42);
			});
	}
});
