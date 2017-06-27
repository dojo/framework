import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import * as timing from '../../../src/async/timing';
import { throwImmediatly } from '../../support/util';
import { isEventuallyRejected } from '../../support/util';
import Promise from '@dojo/shim/Promise';

registerSuite({
	name: 'async/timing',

	'delay()': {
		'delay returning a value after the given timeout': function () {
			return timing.delay(251)(Date.now()).then(function (start: number) {
				const diff: number = Date.now() - start;
				assert.approximately(diff, 251, 100);
			});
		},
		'delay executing a function that returns a value after the given timeout': function () {
			const now = Date.now();
			const getNow = function() {
				return Date.now();
			};
			return timing.delay(251)( getNow ).then(function (finish: number) {
				const diff: number = finish - now;
				assert.approximately(diff, 251, 100);
			});
		},
		'delay executing a function that returns another promise after the given timeout': function () {
			const now = Date.now();
			const getNow = function() {
				return Promise.resolve( Date.now() );
			};
			return timing.delay(251)( getNow ).then(function (finish: number) {
				const diff: number = finish - now;
				assert.approximately(diff, 251, 150);
			});
		},
		'delay should return undefined when the value is not passed in': function () {
			return timing.delay(251)().then(function (value) {
				assert.isUndefined(value);
			});
		},
		'delay can be reusable': function () {
			const start = Date.now();
			const delay = timing.delay(251);
			const p1 = delay().then(function() {
				assert.approximately(Date.now() - start, 251, 150);
			});
			const p2 = delay('foo').then(function(value) {
				assert.strictEqual(value, 'foo');
				assert.approximately(Date.now() - start, 251, 150);
			});
			const p3 = delay(() => Promise.resolve('bar')).then(function(value) {
				assert.strictEqual(value, 'bar');
				assert.approximately(Date.now() - start, 251, 150);
			});
			return Promise.all([p1, p2, p3]);
		}
	},

	'timeout()': {
		'called before the timeout; resolves the promise': function () {
			return Promise.resolve('unused').then((<any> timing).timeout(100, new Error('Error')));
		},

		'called after the timeout; rejects the promise': function () {
			return isEventuallyRejected(
				timing.delay(100)('unused')
					.then(timing.timeout(1, new Error('expected')))
			);
		}
	},

	'DelayedRejection': {
		'is eventually rejected': function () {
			const start = Date.now();
			return new timing.DelayedRejection(101).then(throwImmediatly, function (reason) {
				assert.isUndefined(reason);
				assert.isAbove(Date.now(), start + 99);
				return true;
			});
		},

		'is eventually rejected with error': function () {
			const start = Date.now();
			const expectedError = new Error('boom!');
			return new timing.DelayedRejection(101, expectedError).then(throwImmediatly, function (reason) {
				assert.strictEqual(reason, expectedError);
				assert.isAbove(Date.now(), start + 99);
				return true;
			});
		},

		'works with race': function () {
			return Promise.race([timing.delay(1)('success!'), new timing.DelayedRejection(100)]);
		}
	}
});
