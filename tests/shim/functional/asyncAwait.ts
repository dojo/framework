import * as assert from 'intern/chai!assert';
import * as registerSuite from 'intern!object';

import pollUntil = require('intern/dojo/node!leadfoot/helpers/pollUntil');

registerSuite({
	'Async/Await with Bluebird'(this: any) {
		return this.remote
			.get((<any> require).toUrl('./bluebird.html'))
			.then(pollUntil<any>(function () {
				return (<any> window).callbackValue;
			}, undefined, 5000), undefined)
			.then((callbackValue: number) => {
				assert.equal(callbackValue, 42);
			});
	},

	'Async/Await with Dojo'(this: any) {
		return this.remote
			.get((<any> require).toUrl('./asyncAwait.html'))
			.then(pollUntil<any>(function () {
				return (<any> window).callbackValue;
			}, undefined, 5000), undefined)
			.then((callbackValue: number) => {
				assert.equal(callbackValue, 42);
			});
	},

	'Async/Await with Bluebird and Dojo'(this: any) {
		return this.remote
			.get((<any> require).toUrl('./bluebirdAndDojo.html'))
			.then(pollUntil<any>(function () {
				return (<any> window).callbackValue;
			}, undefined, 5000), undefined)
			.then((callbackValue: number) => {
				assert.equal(callbackValue, 42);
			});
	}
});
