import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import createVNodeEvented from 'src/mixins/createVNodeEvented';

registerSuite({
	name: 'mixins/createVNodeEvented',
	'register vdom event'() {
		let count = 0;
		const vnodeEvented = createVNodeEvented();
		assert.isUndefined(vnodeEvented.listeners.ontouchcancel);
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
		assert.strictEqual(Object.keys(vnodeEvented.listeners).length, 0);
		vnodeEvented.on('foo', (event) => {
			assert.strictEqual(event.type, 'foo');
			count ++;
		});
		assert.strictEqual(Object.keys(vnodeEvented.listeners).length, 0);
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
