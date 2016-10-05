import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import createVNodeEvented from '../../../src/mixins/createVNodeEvented';

registerSuite({
	name: 'mixins/createVNodeEvented',
	'register vdom event'() {
		let count = 0;
		const vnodeEvented = createVNodeEvented();
		assert.deepEqual(vnodeEvented.listeners, {});
		vnodeEvented.on('touchcancel', (event) => {
			assert.strictEqual(event.type, 'touchcancel');
			count++;
		});
		assert.isFunction(vnodeEvented.listeners.ontouchcancel);
		vnodeEvented.emit({ type: 'touchcancel' });
		assert.strictEqual(count, 1);
	},
	'register non vdom event'() {
		let count = 0;
		const vnodeEvented = createVNodeEvented();
		const { listeners: initialListeners } = vnodeEvented;
		vnodeEvented.on('foo', (event) => {
			assert.strictEqual(event.type, 'foo');
			count ++;
		});
		assert.strictEqual(Object.keys(vnodeEvented.listeners).length, 0);
		assert.notStrictEqual(vnodeEvented.listeners, initialListeners);
		vnodeEvented.emit({ type: 'foo' });
		assert.strictEqual(count, 1);
	},
	'listeners on registration'() {
		let count = 0;
		const vnodeEvented = createVNodeEvented({
			listeners: {
				'touchcancel'(event) {
					assert.strictEqual(event.type, 'touchcancel');
					count++;
				}
			}
		});
		assert.isFunction(vnodeEvented.listeners.ontouchcancel);
		vnodeEvented.emit({ type: 'touchcancel' });
		assert.strictEqual(count, 1);
	},
	'vnode event noop doesn\'t throw'() {
		const vnodeEvented = createVNodeEvented();
		vnodeEvented.emit({ type: 'touchcancel' });
	},
	'array of listeners': {
		'during construction'() {
			let count = 0;
			const vnodeEvented = createVNodeEvented({
				listeners: {
					click: [
						function () { count++; },
						function () { count++; }
					]
				}
			});
			assert.isFunction(vnodeEvented.listeners.onclick);
			vnodeEvented.emit({ type: 'click' });
			assert.strictEqual(count, 2);
		},
		'.on()'() {
			let count = 0;
			const vnodeEvented = createVNodeEvented();
			const handle = vnodeEvented.on('click', [
				function () { count++; },
				function () { count++; }
			]);
			assert.isFunction(vnodeEvented.listeners.onclick);
			vnodeEvented.emit({ type: 'click' });
			assert.strictEqual(count, 2);
			handle.destroy();
			vnodeEvented.emit({ type: 'click' });
			assert.strictEqual(count, 2);
		}
	},
	'map of listeners'() {
		let countClick = 0;
		let countFoo = 0;
		const vnodeEvented = createVNodeEvented();
		const handle = vnodeEvented.on({
			'click'() { countClick++; },
			'foo'() { countFoo++; }
		});
		assert.strictEqual(Object.keys(vnodeEvented.listeners).length, 1);
		vnodeEvented.emit({ type: 'click' });
		assert.strictEqual(countClick, 1);
		assert.strictEqual(countFoo, 0);
		vnodeEvented.emit({ type: 'foo' });
		assert.strictEqual(countClick, 1);
		assert.strictEqual(countFoo, 1);
		handle.destroy();
		vnodeEvented.emit({ type: 'click' });
		vnodeEvented.emit({ type: 'foo' });
		assert.strictEqual(countClick, 1);
		assert.strictEqual(countFoo, 1);
	},
	'throws with bad arguments'() {
		const vnodeEvented = createVNodeEvented();
		assert.throws(() => {
			(<any> vnodeEvented).on();
		});
	},
	'actionable': {
		'add action listener'() {
			let count = 0;
			const action = {
				do(options: { event: any }): void {
					assert.strictEqual(options.event.type, 'touchcancel');
					count++;
				}
			};
			const vnodeEvented = createVNodeEvented();
			vnodeEvented.on('touchcancel', action);
			vnodeEvented.emit({ type: 'touchcancel' });
			assert.strictEqual(count, 1);
		}
	}
});
