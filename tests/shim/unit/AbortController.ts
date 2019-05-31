import { AbortController, AbortSignal, ShimAbortController, ShimAbortSignal } from '../../../src/shim/AbortController';

let controller: AbortController;
let signal: AbortSignal;

import has from '../../../src/core/has';

const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');

registerSuite('AbortController and AbortSignal', {
	beforeEach() {
		controller = new ShimAbortController();
		signal = controller.signal;
	},
	tests: {
		'native AbortController'() {
			if (!has('abort-controller')) {
				this.skip('checking native implementation');
			}
			assert.include(
				ShimAbortController.toString(),
				'native',
				'native implementation should represent native code'
			);
		},

		'native AbortSignal'() {
			if (!has('abort-signal')) {
				this.skip('checking native implementation');
			}
			assert.include(ShimAbortSignal.toString(), 'native', 'native implementation should represent native code');
		},

		'AbortController defaults'() {
			assert.isFunction(controller.abort, 'should provide an `abort` method');
			assert.isDefined(controller.signal, 'should provide a signal property');
		},

		'AbortSignal defaults'() {
			assert.isFalse(signal.aborted);
			assert.notExists(signal.onabort);
		},

		'abort event'() {
			const dfd = this.async();
			signal.addEventListener(
				'abort',
				dfd.callback((event: Event) => {
					assert.strictEqual(event.type, 'abort');
					assert.isTrue(signal.aborted);
				})
			);
			controller.abort();
		},

		'onabort method callback'() {
			const dfd = this.async();
			signal.onabort = dfd.callback((event: Event) => {
				assert.strictEqual(event.type, 'abort');
			});
			controller.abort();
		},

		'remove event listener'() {
			let called = false;
			const callback = () => (called = true);
			signal.addEventListener('abort', callback);
			signal.removeEventListener('abort', callback);
			controller.abort();
			assert.isFalse(called, 'callback should not have been called');
		},

		'dispatch event'() {
			return new Promise((resolve) => {
				let called = 0;
				const expectedCalls = 2;
				const createEvent = (type: string) => {
					let event: Event;
					try {
						event = new Event(type);
					} catch (e) {
						if (typeof document !== 'undefined') {
							event = document.createEvent('Event');
							event.initEvent(type, false, false);
						} else {
							event = {
								type,
								bubbles: false,
								cancelable: false
							} as Event;
						}
					}
					return event;
				};
				const callback = () => {
					called++;
					if (called === expectedCalls) {
						assert.strictEqual(called, 2, 'should be called twice');
						resolve();
					}
				};
				signal.onabort = callback;
				signal.addEventListener('abort', callback);
				signal.dispatchEvent(createEvent('test'));
				signal.dispatchEvent(createEvent('abort'));
			});
		}
	}
});
