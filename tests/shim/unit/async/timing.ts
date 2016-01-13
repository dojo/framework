import registerSuite = require('intern!object');
import assert = require('intern/chai!assert');
import * as timing from 'src/async/timing';
import { throwImmediatly } from '../../support/util';
import { isEventuallyRejected } from '../../support/util';
import Promise from 'src/Promise';

registerSuite({
	name: 'async/timing',

	'delay()': {
		'resolves a promise after the given timeout': function () {
			return timing.delay(251)(Date.now()).then(function (start: number) {
				const diff: number = Date.now() - start;
				assert.isAbove(diff, 250);
			});
		}
	},

	'timeout()': {
		'called before the timeout; resolves the promise': function () {
			return Promise.resolve('unused').then(timing.timeout(100, new Error('Error')));
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
			return new timing.DelayedRejection(101).then<any>(throwImmediatly, function (reason) {
				assert.isUndefined(reason);
				assert.isAbove(Date.now(), start + 100);
				return true;
			});
		},

		'is eventually rejected with error': function () {
			const start = Date.now();
			const expectedError = new Error('boom!');
			return new timing.DelayedRejection(101, expectedError).then<any>(throwImmediatly, function (reason) {
				assert.strictEqual(reason, expectedError);
				assert.isAbove(Date.now(), start + 100);
				return true;
			});
		},

		'works with race': function () {
			return Promise.race([timing.delay(1)('success!'), new timing.DelayedRejection(100)]);
		}
	}
});
