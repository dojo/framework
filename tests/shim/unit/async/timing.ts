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
			return timing.delay(250)(Date.now()).then(function (start: number) {
				var diff: number = Date.now() - start;
				assert.closeTo(diff, 250, 25);
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
			var start = Date.now();
			return new timing.DelayedRejection(100).then<any>(throwImmediatly, function (reason) {
				assert.isUndefined(reason);
				assert.closeTo(Date.now(), start + 100, 50);
				return true;
			});
		},

		'is eventually rejected with error': function () {
			var start = Date.now();
			var expectedError = new Error('boom!');
			return new timing.DelayedRejection(100, expectedError).then<any>(throwImmediatly, function (reason) {
				assert.strictEqual(reason, expectedError);
				assert.closeTo(Date.now(), start + 100, 50);
				return true;
			});
		},

		'works with race': function () {
			return Promise.race([timing.delay(1)('success!'), new timing.DelayedRejection(100)]);
		}
	}
});
