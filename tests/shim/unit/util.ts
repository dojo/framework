import registerSuite = require('intern!object');
import assert = require('intern/chai!assert');
import sinon = require('sinon');
import { Handle } from 'src/interfaces';
import * as util from 'src/util';

registerSuite({
	name: 'utility functions',

	createTimer: (function () {
		let timer: Handle;

		return {
			afterEach() {
				timer && timer.destroy();
				timer = null;
			},

			destroy() {
				const dfd = this.async(1000);
				const spy = sinon.spy();
				timer = util.createTimer(spy, 100);

				setTimeout(function () {
					timer.destroy();
				}, 50);

				setTimeout(dfd.callback(function () {
					assert.strictEqual(spy.callCount, 0);
				}), 110);
			},

			timeout() {
				const dfd = this.async(1000);
				const spy = sinon.spy();
				timer = util.createTimer(spy, 100);

				setTimeout(dfd.callback(function () {
					assert.strictEqual(spy.callCount, 1);
				}), 110);
			}
		};
	})(),

	debounce: {
		'debounces callback'() {
			const dfd = this.async(1000);
			const spy = sinon.spy();
			const debouncedFunction = util.debounce(spy, 100);

			debouncedFunction();
			assert.strictEqual(spy.callCount, 0,
				'Function should not be called until period has elapsed without further calls');

			setTimeout(function () {
				debouncedFunction();
			}, 80);

			setTimeout(function () {
				debouncedFunction();
			}, 160);

			setTimeout(dfd.callback(function () {
				assert.strictEqual(spy.callCount, 1,
					'Function should be called once after a full period has elapsed with no calls, ' +
					'after multiple calls within period');
			}), 300);
		},

		'fires callback after debounce period'() {
			const dfd = this.async(1000);
			const spy = sinon.spy();
			const debouncedFunction = util.debounce(spy, 50);

			debouncedFunction();

			setTimeout(function () {
				debouncedFunction();
			}, 100);

			setTimeout(function () {
				debouncedFunction();
			}, 200);

			setTimeout(dfd.callback(function () {
				assert.strictEqual(spy.callCount, 3);
			}), 300);
		}
	},

	throttle: {
		'throttles callback'() {
			const spy = sinon.spy();
			const throttledFunction = util.throttle(spy, 100);

			throttledFunction();
			assert.strictEqual(spy.callCount, 1,
				'Function should be called as soon as it is first invoked');

			setTimeout(function () {
				throttledFunction();
				throttledFunction();
				throttledFunction();
			}, 80);

			setTimeout(this.async().callback(function () {
				assert.strictEqual(spy.callCount, 1,
					'Further calls within same interval should be suppressed');
			}), 150);
		},

		'allows one callback per interval'() {
			const dfd = this.async(1000);
			const spy = sinon.spy();
			const throttledFunction = util.throttle(spy, 50);

			throttledFunction();

			setTimeout(function () {
				throttledFunction();
			}, 100);

			setTimeout(dfd.callback(function () {
				throttledFunction();
				assert.strictEqual(spy.callCount, 3);
			}), 200);
		}
	},

	throttleAfter: {
		'throttles callback'() {
			const dfd = this.async(1000);
			const spy = sinon.spy();
			const throttledFunction = util.throttleAfter(spy, 100);

			throttledFunction();
			assert.strictEqual(spy.callCount, 0,
				'Function should not be called until end of interval');

			setTimeout(function () {
				throttledFunction();
				throttledFunction();
				throttledFunction();
			}, 90);

			setTimeout(dfd.callback(function () {
				assert.strictEqual(spy.callCount, 1,
					'Function should be called once by end of interval');
			}), 150);
		},

		'allows one callback per interval'() {
			const dfd = this.async(1000);
			const spy = sinon.spy();
			const throttledFunction = util.throttleAfter(spy, 50);

			throttledFunction();

			setTimeout(function () {
				throttledFunction();
			}, 100);

			setTimeout(function () {
				throttledFunction();
			}, 200);

			setTimeout(dfd.callback(function () {
				assert.strictEqual(spy.callCount, 3);
			}), 300);
		}
	}
});
