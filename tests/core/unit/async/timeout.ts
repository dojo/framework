import registerSuite = require('intern!object');
import assert = require('intern/chai!assert');
import timeout from 'src/async/timeout';
import delay from 'src/async/delay';
import { isEventuallyRejected } from '../../support/util';

registerSuite({
	name: 'async/timeout',

	'called before the timeout; resolves the promise': function () {
		return Promise.resolve('unused').then(timeout(100, new Error('Error')));
	},

	'called after the timeout; rejects the promise': function () {
		return isEventuallyRejected(
			delay(100)('unused')
				.then(timeout(1, new Error('expected')))
		);
	}
});
