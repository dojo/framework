import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import ExtensiblePromise from '../../../src/async/ExtensiblePromise';

registerSuite({
	name: 'ExtensiblePromise',

	'reject': function (this: any) {
		let dfd = this.async();
		ExtensiblePromise.reject().then(
			dfd.rejectOnError(() => assert.isTrue(false, 'Should not have called then with a rejected promise')),
			dfd.callback(() => {
			})
		);
	},

	'resolve': function (this: any) {
		let dfd = this.async();
		ExtensiblePromise.resolve().then(
			dfd.callback(() => {
			}),
			dfd.rejectOnError(() => assert.isTrue(false, 'Promise was rejected but it should have resolved'))
		);
	},

	'catch': function (this: any) {
		let dfd = this.async();
		ExtensiblePromise.reject().catch(
			dfd.callback(() => {
			})
		);
	},

	'then resolve w/ no handler': function (this: any) {
		let dfd = this.async();
		ExtensiblePromise.resolve().then(undefined, dfd.rejectOnError(() => {
			assert.isTrue(false, 'Should not have rejected');
		}));
		setTimeout(dfd.callback(() => {
		}), 100);
	},

	'then reject w/ no handler': function (this: any) {
		let dfd = this.async();

		ExtensiblePromise.reject().then(dfd.rejectOnError(() => {
			assert.isTrue(false, 'Should not have resolved');
		}), undefined).catch(dfd.callback(() => {
		}));
	},

	'.all': {
		'with array'() {
			return ExtensiblePromise.all([ 1, ExtensiblePromise.resolve(2), new ExtensiblePromise((resolve) => {
				setTimeout(() => resolve(3), 100);
			}) ]).then((results: any) => {
				assert.deepEqual(results, [ 1, 2, 3 ]);
			});
		},

		'with object'() {
			return ExtensiblePromise.all({
				one: 1, two: ExtensiblePromise.resolve(2), three: new ExtensiblePromise((resolve) => {
					setTimeout(() => resolve(3), 100);
				})
			}).then((results: any) => {
				assert.deepEqual(results, { one: 1, two: 2, three: 3 });
			});
		},

		'errors with object'(this: any) {
			let dfd = this.async();

			ExtensiblePromise.all({
				one: ExtensiblePromise.resolve(1),
				two: ExtensiblePromise.reject(new Error('error message'))
			}).then(dfd.rejectOnError(() => {
				assert.fail('should have failed');
			}), dfd.callback((error: Error) => {
				assert.equal(error.message, 'error message');
			}));
		}
	}
});
