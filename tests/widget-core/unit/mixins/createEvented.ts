import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import createEvented from 'src/mixins/createEvented';
import createAction from 'dojo-actions/createAction';

registerSuite({
	name: 'mixins/createEvented',
	creation() {
		const evented = createEvented();
		assert(evented);
		assert.isFunction(evented.on);
		assert.isFunction(evented.emit);
	},
	'listeners at creation'() {
		const eventStack: string[] = [];
		const evented = createEvented({
			listeners: {
				'foo'(event) {
					eventStack.push(event.type);
				},
				'bar'(event) {
					eventStack.push(event.type);
				}
			}
		});

		evented.emit({ type: 'foo' });
		evented.emit({ type: 'bar' });
		evented.emit({ type: 'baz' });

		evented.destroy();

		evented.emit({ type: 'foo' });
		evented.emit({ type: 'bar' });
		evented.emit({ type: 'baz' });

		assert.deepEqual(eventStack, [ 'foo', 'bar' ]);
	},
	'on': {
		'on()'() {
			const eventStack: string[] = [];
			const evented = createEvented();
			const handle = evented.on('foo', (event) => {
				eventStack.push(event.type);
			});

			evented.emit({ type: 'foo' });
			evented.emit({ type: 'bar' });

			handle.destroy();

			evented.emit({ type: 'foo' });
			evented.emit({ type: 'bar' });

			assert.deepEqual(eventStack, [ 'foo' ]);
		},
		'listener on creation, plus on'() {
			const eventStack: string[] = [];
			const evented = createEvented({
				listeners: {
					foo(event) {
						eventStack.push('listener:' + event.type);
					}
				}
			});

			const handle = evented.on('foo', (event) => {
				eventStack.push('on:' + event.type);
			});

			evented.emit({ type: 'foo' });
			handle.destroy();
			evented.emit({ type: 'foo' });
			evented.destroy();
			evented.emit({ type: 'foo' });

			assert.deepEqual(eventStack, [ 'listener:foo', 'on:foo', 'listener:foo' ]);
		},
		'multiple listeners, same event'() {
			const eventStack: string[] = [];
			const evented = createEvented();

			const handle1 = evented.on('foo', () => {
				eventStack.push('one');
			});
			const handle2 = evented.on('foo', () => {
				eventStack.push('two');
			});

			evented.emit({ type: 'foo' });
			handle1.destroy();
			evented.emit({ type: 'foo' });
			handle2.destroy();
			evented.emit({ type: 'foo' });

			assert.deepEqual(eventStack, [ 'one', 'two', 'two' ]);
		}
	},
	'actions': {
		'listener'() {
			const eventStack: string[] = [];
			const action = {
				do(options: { event: { type: string; } }): void {
					eventStack.push(options.event.type);
				}
			};

			const evented = createEvented({
				listeners: {
					foo: action
				}
			});

			const handle = evented.on('bar', action);

			evented.emit({ type: 'foo' });
			evented.emit({ type: 'bar' });
			evented.emit({ type: 'baz' });

			evented.destroy();

			evented.emit({ type: 'foo' });
			evented.emit({ type: 'bar' });
			evented.emit({ type: 'baz' });

			handle.destroy();

			evented.emit({ type: 'foo' });
			evented.emit({ type: 'bar' });
			evented.emit({ type: 'baz' });

			assert.deepEqual(eventStack, [ 'foo', 'bar', 'bar' ]);
		},
		'byType'() {
			const eventStack: string[] = [];
			const actionFoo = createAction({
				type: 'foo',
				do(options: { event: { type: string; } }): void {
					eventStack.push(options.event.type);
				}
			});
			const actionBar = createAction({
				type: 'bar',
				do(options: { event: { type: string; } }): void {
					eventStack.push(options.event.type);
				}
			});

			const evented = createEvented({
				listeners: {
					foo: 'foo'
				}
			});

			evented.on('bar', 'bar');

			evented.emit({ type: 'foo' });
			evented.emit({ type: 'bar' });

			assert.deepEqual(eventStack, [ 'foo', 'bar' ]);

			actionFoo.destroy();
			actionBar.destroy();
		},
		'missing action type on creation throws'() {
			assert.throws(() => {
				createEvented({
					listeners: {
						foo: 'foo'
					}
				});
			}, Error, 'Cannot resolve action type');
		},
		'missing action type on throws'() {
			const evented = createEvented();
			assert.throws(() => {
				evented.on('bar', 'bar');
			}, Error, 'Cannot resolve action type');
		}
	}
});
