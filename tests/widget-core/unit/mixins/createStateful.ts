import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import createStateful, { StateChangeEvent } from 'src/mixins/createStateful';
import { Observable, Observer } from 'rxjs/Rx';
import { Handle } from 'dojo-core/interfaces';
import Promise from 'dojo-core/Promise';

let _hasStrictModeCache: boolean;

/**
 * Detects if the current runtime environment fully supports
 * strict mode (IE9 does not).
 */
function hasStrictMode(): boolean {
	if (_hasStrictModeCache !== undefined) {
		return _hasStrictModeCache;
	}
	try {
		const f = new Function(`return function f() {
			'use strict';
			var a = 021;
			var b = function (eval) {}
			var c = function (arguments) {}
			function d(foo, foo) {}
			function e(eval, arguments) {}
			function eval() {}
			function arguments() {}
			function interface(){}
			with (x) { }
			try { eval++; } catch (arguments) {}
			return { x: 1, y: 2, x: 1 }
		}`);
		f();
	}
	catch (err) {
		return _hasStrictModeCache = true;
	}
	return _hasStrictModeCache = false;
}

registerSuite({
	name: 'mixins/createStateful',
	creation() {
		const state = { foo: 'bar' };
		const stateful = createStateful();
		assert(stateful);
		assert.isObject(stateful.state, 'state should be an object');
		assert.isFunction(stateful.setState, 'setState should be a function');
		assert.isUndefined(stateful.setState(state), 'return from setState should be undefined');
		assert.notStrictEqual(stateful.state, state, 'state should be deep assigned');
		assert.deepEqual(stateful.state, state, 'state should deeply equal state');
	},
	'statechange event'() {
		const dfd = this.async();

		const state = { foo: 'bar' };

		const stateful = createStateful();
		const handle = stateful.on('statechange', dfd.callback((event: StateChangeEvent<any>) => {
			assert.deepEqual(event.type, 'statechange');
			assert.deepEqual(event.state, state);
			assert.notStrictEqual(event.state, state);
			assert.strictEqual(event.state, stateful.state);
		}));

		stateful.setState(state);

		handle.destroy();
	},
	'state read only'() {
		const stateful = createStateful({
			state: {
				foo: 'foo'
			}
		});

		if (hasStrictMode()) {
			assert.throws(() => {
				stateful.state = { foo: 'bar' };
			}, TypeError);
		}
		else {
			assert.deepEqual(stateful.state, { foo: 'foo' });
			stateful.state = { foo: 'bar' };
			assert.deepEqual(stateful.state, { foo: 'foo' });
		}
	},
	'state on creation'() {
		const stateful = createStateful({
			state: { foo: 'bar' }
		});

		assert.strictEqual(stateful.state.foo, 'bar');
	},
	'observing state': {
		'observeState'() {
			const dfd = this.async();
			const stateful = createStateful();
			const observable = {
				observe(id: string): Observable<Object> {
					assert.strictEqual(id, 'foo');
					return new Observable<Object>(function subscribe(observer: Observer<Object>) {
						setTimeout(() => {
							observer.next({ id: 'foo', foo: 'foo' });
							observer.next({ id: 'foo', foo: 'bar' });
							observer.next({ id: 'foo', foo: 'qat' });
						}, 1);
					});
				},
				patch(partial: any, options?: { id?: string }): Promise<Object> {
					return Promise.resolve(partial);
				}
			};

			let count = 0;
			let handle: Handle;

			stateful.on('statechange', (event) => {
				count++;
				if (count === 1) {
					assert.deepEqual(event.target.state, { id: 'foo', foo: 'foo' });
				}
				else if (count === 2) {
					assert.deepEqual(event.target.state, { id: 'foo', foo: 'bar' });
					handle.destroy();
					setTimeout(() => {
						dfd.resolve();
					}, 10);
				}
				else {
					dfd.reject(new Error(`Unexpected call to 'statechange', called ${count} times`));
				}
			});

			handle = stateful.observeState('foo', observable);
		},
		'observe on construction'() {
			const observable = {
				observe(id: string): Observable<Object> {
					assert.strictEqual(id, 'foo');
					return new Observable<Object>(function subscribe(observer: Observer<Object>) {
						observer.next({ id: 'foo', foo: 'foo' });
					});
				},
				patch(partial: any, options?: { id?: string }): Promise<Object> {
					return Promise.resolve(partial);
				}
			};

			const stateful = createStateful({
				id: 'foo',
				stateFrom: observable
			});

			assert.deepEqual(stateful.state, { id: 'foo', foo: 'foo' });
		},
		'throws on construction with missing value'() {
			assert.throws(() => {
				createStateful({
					id: 'foo'
				});
			}, TypeError);
		}
	}
});
