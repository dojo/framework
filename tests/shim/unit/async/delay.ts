import registerSuite = require('intern!object');
import assert = require('intern/chai!assert');
import delay from 'src/async/delay';

registerSuite({
	name: 'async/delay',

	'resolves a promise after the given timeout': function () {
		return delay(250)(Date.now()).then(function (start: number) {
			var diff: number = Date.now() - start;
			assert.closeTo(diff, 250, 25);
		});
	}
});
