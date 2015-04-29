import registerSuite = require('intern!object');
import assert = require('intern/chai!assert');
import nextTick from 'src/nextTick';

registerSuite({
	name: 'nextTick',

	'nextTick fires on a delay but before setTimeout'() {
		let numTicks = 5;
		let nextTicks = numTicks;
		let timeouts = 1;
		let dfd = this.async(1000, numTicks + timeouts);

		for (let i = 0; i < numTicks; i++) {
			nextTick(dfd.callback(() => {
				assert.equal(timeouts, 1, 'nextTick should have fired before setTimeout');
				nextTicks--;
			}));
		}

		setTimeout(dfd.callback(() => {
			assert.equal(nextTicks, 0, 'all nextTicks should have fired before setTimeout');
			timeouts--;
		}));

		assert.equal(nextTicks, numTicks);
		assert.equal(timeouts, 1);
	},

	remove() {
		let dfd = this.async();

		let handle = nextTick(dfd.rejectOnError(() => {
			assert(false, 'nextTick should not have fired');
		}));

		handle.destroy();
		setTimeout(() => dfd.resolve(), 10);
	}
});
